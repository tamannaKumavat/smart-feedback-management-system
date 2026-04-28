"""HTTP controllers for the chat ticketing system.

This module is intentionally thin: it parses request bodies, delegates
to :mod:`services.chat_service` and :mod:`services.ai_service`, and
serialises the results. All business rules (ownership, status
transitions, ticket creation) live in the service layer.

Authentication reuses the existing JWT-based ``get_current_user``
dependency from :mod:`services.security`.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Iterator
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db import SessionLocal, get_db
from models.chat import Chat, Message, Ticket
from models.user import User
from services import ai_service, attachment_service, chat_service
from services.chat_service import ChatError
from services.security import get_current_user

router = APIRouter(prefix="/api", tags=["chats"])
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------


class CreateChatResponse(BaseModel):
    id: str
    user_id: str = Field(alias="userId")
    status: str
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")
    model_config = {"populate_by_name": True}


class SendMessageBody(BaseModel):
    chat_id: str = Field(..., alias="chatId")
    content: str = Field(..., min_length=1)
    # Opt out of streaming for clients that want a single JSON response.
    stream: bool = True
    # Attachment ids previously obtained from POST /api/uploads.
    attachment_ids: list[str] = Field(default_factory=list, alias="attachmentIds")
    model_config = {"populate_by_name": True}


class ConfirmBody(BaseModel):
    chat_id: str = Field(..., alias="chatId")
    accepted: bool
    model_config = {"populate_by_name": True}


def _chat_dto(chat: Chat) -> dict[str, Any]:
    return {
        "id": chat.id,
        "userId": chat.user_id,
        "status": chat.status,
        "createdAt": chat.created_at.isoformat() if chat.created_at else None,
        "updatedAt": chat.updated_at.isoformat() if chat.updated_at else None,
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
        "chatId": msg.chat_id,
        "sender": msg.sender,
        "content": msg.content,
        "aiAnswerType": msg.ai_answer_type,
        "createdAt": msg.created_at.isoformat() if msg.created_at else None,
        "attachments": attachments,
    }


def _ticket_dto(ticket: Ticket) -> dict[str, Any]:
    return {
        "id": ticket.id,
        "chatId": ticket.chat_id,
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
    chat = chat_service.create_chat(db, user_id=current_user.id)
    return {"ok": True, "chat": _chat_dto(chat)}


@router.get("/chats/{chat_id}/messages")
def get_chat_messages(
    chat_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        messages = chat_service.list_messages(db, chat_id, current_user.id)
        chat = chat_service.get_chat_for_user(db, chat_id, current_user.id)
    except ChatError as e:
        raise _from_chat_error(e) from e
    return {
        "ok": True,
        "chat": _chat_dto(chat),
        "messages": [_message_dto(m) for m in messages],
    }


@router.post("/messages")
def send_message(
    body: SendMessageBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a user message and get the AI reply.

    Streams the AI reply as Server-Sent Events when ``stream`` is true
    (default). Each event has a ``type`` of ``token``, ``done`` or
    ``error``. The final ``done`` event includes the persisted user and
    AI messages plus the resulting chat status.
    """
    try:
        chat = chat_service.get_chat_for_user(db, body.chat_id, current_user.id)
        user_msg = chat_service.record_user_message(db, chat, body.content.strip())
        if body.attachment_ids:
            attachment_service.link_attachments_to_message(
                db,
                message=user_msg,
                attachment_ids=body.attachment_ids,
                user_id=current_user.id,
            )
            db.refresh(user_msg)
        history = chat_service.list_messages(db, chat.id, current_user.id)
    except ChatError as e:
        raise _from_chat_error(e) from e

    # Exclude the just-saved user message so the AI prompt doesn't
    # duplicate it (the user message is appended explicitly inside the
    # AI service).
    prior_history = [m for m in history if m.id != user_msg.id]

    if not body.stream:
        response = ai_service.generate(prior_history, body.content)
        ai_msg = chat_service.record_ai_message(
            db, chat, response.content, response.answer_type
        )
        db.refresh(chat)
        return {
            "ok": True,
            "chat": _chat_dto(chat),
            "userMessage": _message_dto(user_msg),
            "aiMessage": _message_dto(ai_msg),
        }

    return StreamingResponse(
        _stream_ai_reply(
            chat_id=chat.id,
            user_id=current_user.id,
            user_msg_dto=_message_dto(user_msg),
            history=prior_history,
            user_message=body.content,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


def _sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event)}\n\n"


def _stream_ai_reply(
    chat_id: str,
    user_id: str,
    user_msg_dto: dict[str, Any],
    history: list[Message],
    user_message: str,
) -> Iterator[bytes]:
    """Generator that drives the SSE response.

    The request-scoped DB session injected by FastAPI is closed as soon
    as the route function returns, so we open a fresh session here for
    the post-stream persistence step.
    """
    yield _sse({"type": "user_message", "message": user_msg_dto}).encode("utf-8")

    try:
        chunks, holder = ai_service.stream(history, user_message)
        for chunk in chunks:
            yield _sse({"type": "token", "content": chunk}).encode("utf-8")
    except Exception as exc:  # pragma: no cover - defensive
        log.exception("AI streaming failed")
        yield _sse({"type": "error", "message": str(exc)}).encode("utf-8")
        return

    response = holder.response
    db = SessionLocal()
    try:
        chat = chat_service.get_chat_for_user(db, chat_id, user_id)
        ai_msg = chat_service.record_ai_message(
            db, chat, response.content, response.answer_type
        )
        payload = {
            "type": "done",
            "chat": _chat_dto(chat),
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
        chat, ticket = chat_service.confirm_summary(
            db, body.chat_id, current_user.id, accepted=body.accepted
        )
    except ChatError as e:
        raise _from_chat_error(e) from e

    return {
        "ok": True,
        "chat": _chat_dto(chat),
        "ticket": _ticket_dto(ticket) if ticket else None,
    }


@router.get("/drafts")
def list_drafts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    drafts = chat_service.list_drafts(db, current_user.id)
    return {"ok": True, "drafts": [_chat_dto(c) for c in drafts]}


@router.post("/chats/{chat_id}/resume")
def resume_chat(
    chat_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        chat = chat_service.resume_draft(db, chat_id, current_user.id)
    except ChatError as e:
        raise _from_chat_error(e) from e
    return {"ok": True, "chat": _chat_dto(chat)}


@router.post("/chats/{chat_id}/draft")
def mark_chat_as_draft(
    chat_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Optional helper: explicitly mark a chat as draft.

    The frontend can call this on ``beforeunload`` / route-change so the
    user can find the conversation later under ``GET /drafts``.
    """
    try:
        chat = chat_service.mark_as_draft(db, chat_id, current_user.id)
    except ChatError as e:
        raise _from_chat_error(e) from e
    return {"ok": True, "chat": _chat_dto(chat)}
