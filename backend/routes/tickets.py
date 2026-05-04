"""Read endpoints for the current user's tickets."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models.chat import Message, Ticket
from models.user import User
from services import ticket_service
from services.security import get_current_user

router = APIRouter(prefix="/api", tags=["tickets"])


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


def _ticket_dto(ticket: Ticket, messages: list[Message]) -> dict[str, Any]:
    return {
        "caseId": ticket.case_id,
        "chatId": ticket.chat_id,
        "userId": ticket.user_id,
        "summary": ticket.summary,
        "description": ticket.description,
        "issueType": ticket.issue_type,
        "priority": ticket.priority,
        "team": ticket.team,
        "assignee": ticket.assignee,
        "status": ticket.status,
        "labels": ticket.labels or [],
        "recommendedAction": ticket.recommended_action,
        "createdAt": ticket.created_at.isoformat() if ticket.created_at else None,
        "updatedAt": ticket.updated_at.isoformat() if ticket.updated_at else None,
        "messages": [_message_dto(m) for m in messages],
        "messageCount": len(messages),
    }



@router.get("/tickets")
def list_my_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tickets = ticket_service.list_user_tickets(db, current_user.id)
    out = []
    for t in tickets:
        msgs = ticket_service.messages_for_chat(db, t.chat_id)
        out.append(_ticket_dto(t, msgs))
    return {"ok": True, "tickets": out}


@router.get("/tickets/{ticket_id}")
def get_my_ticket(
    ticket_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = ticket_service.get_user_ticket(db, ticket_id, current_user.id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    msgs = ticket_service.messages_for_chat(db, ticket.chat_id)
    return {"ok": True, "ticket": _ticket_dto(ticket, msgs)}
