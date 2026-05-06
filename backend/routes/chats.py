"""HTTP controllers for the issue/chat system."""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db import SessionLocal, get_db
from models.chat import AI_ANSWER_NORMAL, Issue, Message, Ticket
from models.user import User
from services import attachment_service, chat_service
from services.chat_service import ChatError
from services.security import get_current_user
from workflows.smart_feedback.workflow import build_workflow

router = APIRouter(prefix="/api", tags=["chats"])
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------


class SendMessageBody(BaseModel):
    chat_id: str = Field(..., alias="chatId")
    content: str = Field(..., min_length=1)
    stream: bool = True
    attachment_ids: list[str] = Field(default_factory=list, alias="attachmentIds")
    model_config = {"populate_by_name": True}


class ConfirmBody(BaseModel):
    issue_id: str = Field(..., alias="issueId")
    accepted: bool
    model_config = {"populate_by_name": True}


def _issue_dto(issue: Issue) -> dict[str, Any]:
    return {
        "id": issue.id,
        "userId": issue.user_id,
        "status": issue.status,
        "summary": issue.summary,
        "resolvedBy": issue.resolved_by,
        "createdAt": issue.created_at.isoformat() if issue.created_at else None,
        "updatedAt": issue.updated_at.isoformat() if issue.updated_at else None,
    }


def _message_dto(msg: Message) -> dict[str, Any]:
    attachments = []
    for att in getattr(msg, "attachments", []) or []:
        attachments.append(
            {
                "id": att.id,
                "filename": att.filename,
                "mimeType": att.mime_type,
                "sizeBytes": att.size_bytes,
                "url": f"/api/uploads/{att.id}",
            }
        )
    return {
        "id": msg.id,
        "issueId": msg.issue_id,
        "sender": msg.sender,
        "content": msg.content,
        "aiAnswerType": msg.ai_answer_type,
        "createdAt": msg.created_at.isoformat() if msg.created_at else None,
        "attachments": attachments,
    }


def _ticket_dto(ticket: Ticket) -> dict[str, Any]:
    return {
        "caseId": ticket.case_id,
        "issueId": ticket.issue_id,
        "userId": ticket.user_id,
        "summary": ticket.summary,
        "status": ticket.status,
        "createdAt": ticket.created_at.isoformat() if ticket.created_at else None,
    }


def _from_chat_error(exc: ChatError) -> HTTPException:
    return HTTPException(status_code=exc.http_status, detail=str(exc))


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/chats", status_code=status.HTTP_201_CREATED)
def create_chat(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    issue = chat_service.create_chat(db, user_id=current_user.id)
    return {"ok": True, "chat": _issue_dto(issue)}


@router.get("/chats/{chat_id}/messages")
def get_chat_messages(
    chat_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        messages = chat_service.list_messages(db, chat_id, current_user.id)
        issue = chat_service.get_chat_for_user(db, chat_id, current_user.id)
    except ChatError as e:
        raise _from_chat_error(e) from e
    return {
        "ok": True,
        "issue": _issue_dto(issue),
        "messages": [_message_dto(m) for m in messages],
    }


@router.post("/messages")
async def send_message(
    body: SendMessageBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        issue = chat_service.get_chat_for_user(db, body.chat_id, current_user.id)
        user_msg = chat_service.record_user_message(db, issue, body.content.strip())
        if body.attachment_ids:
            attachment_service.link_attachments_to_message(
                db,
                message=user_msg,
                attachment_ids=body.attachment_ids,
                user_id=current_user.id,
            )
            db.refresh(user_msg)
        history = chat_service.list_messages(db, issue.id, current_user.id)
    except ChatError as e:
        raise _from_chat_error(e) from e

    prior_msgs = [
        {"sender": m.sender, "content": m.content}
        for m in history if m.id != user_msg.id
    ]

    if not body.stream:
        try:
            result = await asyncio.to_thread(
                build_workflow().run, body.content, prior_msgs
            )
        except Exception as exc:
            log.exception("Workflow failed")
            raise HTTPException(status_code=500, detail="AI workflow failed") from exc
        response_text = result.get("engagement_response") or "Thank you, we'll look into this."
        ai_msg = chat_service.record_ai_message(db, issue, response_text, AI_ANSWER_NORMAL)
        db.refresh(issue)
        return {
            "ok": True,
            "chat": _issue_dto(issue),
            "userMessage": _message_dto(user_msg),
            "aiMessage": _message_dto(ai_msg),
        }

    return StreamingResponse(
        _stream_ai_reply(
            issue_id=issue.id,
            user_id=current_user.id,
            user_msg_dto=_message_dto(user_msg),
            user_message=body.content,
            prior_msgs=prior_msgs,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


def _sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event)}\n\n"


async def _stream_ai_reply(
    issue_id: str,
    user_id: str,
    user_msg_dto: dict[str, Any],
    user_message: str,
    prior_msgs: list[dict],
) -> AsyncIterator[bytes]:
    yield _sse({"type": "user_message", "message": user_msg_dto}).encode("utf-8")

    response_text = "Thank you, we'll look into this."

    try:
        result = await asyncio.to_thread(
            build_workflow().run, user_message, prior_msgs
        )
        response_text = result.get("engagement_response") or response_text
    except Exception as exc:
        log.exception("Workflow streaming failed")
        yield _sse({"type": "error", "message": str(exc)}).encode("utf-8")
        response_text = "I'm sorry, I wasn't able to process your request right now. Please try again in a moment."

    chunk_size = 24
    for i in range(0, len(response_text), chunk_size):
        yield _sse({"type": "token", "content": response_text[i: i + chunk_size]}).encode("utf-8")
        await asyncio.sleep(0.02)

    db = SessionLocal()
    try:
        issue = chat_service.get_chat_for_user(db, issue_id, user_id)
        ai_msg = chat_service.record_ai_message(db, issue, response_text, AI_ANSWER_NORMAL)
        payload = {
            "type": "done",
            "chat": _issue_dto(issue),
            "aiMessage": _message_dto(ai_msg),
        }
    except ChatError as e:
        payload = {"type": "error", "message": str(e)}
    finally:
        db.close()

    yield _sse(payload).encode("utf-8")


@router.post("/confirm")
def confirm(
    body: ConfirmBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        issue, ticket = chat_service.confirm_summary(
            db, body.issue_id, current_user.id, accepted=body.accepted
        )
    except ChatError as e:
        raise _from_chat_error(e) from e

    return {
        "ok": True,
        "chat": _issue_dto(issue),
        "ticket": _ticket_dto(ticket) if ticket else None,
    }


@router.get("/drafts")
def list_drafts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    drafts = chat_service.list_drafts(db, current_user.id)
    return {"ok": True, "drafts": [_issue_dto(c) for c in drafts]}


@router.post("/chats/{chat_id}/resume")
def resume_chat(
    chat_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        issue = chat_service.resume_draft(db, chat_id, current_user.id)
    except ChatError as e:
        raise _from_chat_error(e) from e
    return {"ok": True, "chat": _issue_dto(issue)}


@router.post("/chats/{chat_id}/draft")
def mark_chat_as_draft(
    chat_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        issue = chat_service.mark_as_draft(db, chat_id, current_user.id)
    except ChatError as e:
        raise _from_chat_error(e) from e
    return {"ok": True, "chat": _issue_dto(issue)}
