"""HTTP controllers for the issue/chat system."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db import get_db
from models.chat import Issue, Message, Ticket
from models.user import User
from services import chat_service
from services.chat_service import ChatError
from services.security import get_current_user

router = APIRouter(prefix="/api", tags=["chats"])
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------


class ConfirmBody(BaseModel):
    issue_id: str = Field(..., alias="issueId")
    accepted: bool
    model_config = {"populate_by_name": True}


def _issue_dto(
    issue: Issue, *, first_message: str | None = None
) -> dict[str, Any]:
    summary = (issue.summary or "").strip() or None
    preview = (first_message or "").strip() or None
    display_summary = summary or preview
    return {
        "id": issue.id,
        "userId": issue.user_id,
        "status": issue.status,
        "summary": issue.summary,
        "displaySummary": display_summary,
        "firstMessage": preview,
        "response": issue.response,
        "responseComments": issue.response_comments or [],
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


@router.get("/issues")
def list_issues(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    issues = chat_service.list_issues(db, current_user.id)
    issue_ids = [i.id for i in issues]
    first_by_issue = chat_service.first_messages_by_issue(db, issue_ids)
    return {
        "ok": True,
        "issues": [
            _issue_dto(i, first_message=first_by_issue.get(i.id)) for i in issues
        ],
    }


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
