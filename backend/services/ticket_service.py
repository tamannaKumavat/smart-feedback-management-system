"""Read-only helpers for tickets owned by a user."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.chat import Chat, Message, Ticket


def list_user_tickets(db: Session, user_id: str) -> list[Ticket]:
    stmt = (
        select(Ticket)
        .where(Ticket.user_id == user_id)
        .order_by(Ticket.created_at.desc())
    )
    return list(db.execute(stmt).scalars())


def get_user_ticket(db: Session, ticket_id: str, user_id: str) -> Ticket | None:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None or ticket.user_id != user_id:
        return None
    return ticket


def messages_for_chat(db: Session, chat_id: str) -> list[Message]:
    stmt = (
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(Message.created_at, Message.id)
    )
    return list(db.execute(stmt).scalars())


def chat_for_ticket(db: Session, ticket: Ticket) -> Chat | None:
    return db.get(Chat, ticket.chat_id)
