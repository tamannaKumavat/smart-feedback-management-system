"""SQLAlchemy models for the chat ticketing system.

Three entities:

- Chat: a conversation owned by a user, with a lifecycle status.
- Message: an utterance in a chat, from either the user or the AI.
- Ticket: a structured record materialised from a chat once the user
  confirms an AI-produced summary.

IDs are stored as 36-character UUID strings to keep the schema portable
and to match the existing string-based ``users.id`` foreign key style.
"""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db import Base


def _new_uuid() -> str:
    return str(uuid4())


# Chat lifecycle states.
CHAT_STATUS_ACTIVE = "active"
CHAT_STATUS_WAITING_CONFIRMATION = "waiting_confirmation"
CHAT_STATUS_DRAFT = "draft"
CHAT_STATUS_CLOSED = "closed"
CHAT_STATUSES = {
    CHAT_STATUS_ACTIVE,
    CHAT_STATUS_WAITING_CONFIRMATION,
    CHAT_STATUS_DRAFT,
    CHAT_STATUS_CLOSED,
}

# Message senders.
SENDER_USER = "user"
SENDER_AI = "ai"
SENDERS = {SENDER_USER, SENDER_AI}

# AI response variants.
AI_ANSWER_NORMAL = "normal"
AI_ANSWER_SUMMARY = "summary"
AI_ANSWER_TYPES = {AI_ANSWER_NORMAL, AI_ANSWER_SUMMARY}

# Ticket states.
TICKET_STATUS_NEW = "New"
TICKET_STATUS_IN_PROGRESS = "In Progress"
TICKET_STATUS_RESOLVED = "Resolved"
TICKET_STATUS_OPEN = "Open"
TICKET_STATUSES = {TICKET_STATUS_NEW, TICKET_STATUS_IN_PROGRESS, TICKET_STATUS_RESOLVED}


class Chat(Base):
    __tablename__ = "chats"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=CHAT_STATUS_ACTIVE
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    messages: Mapped[list["Message"]] = relationship(
        "Message",
        back_populates="chat",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )
    tickets: Mapped[list["Ticket"]] = relationship(
        "Ticket", back_populates="chat", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_chats_user_status", "user_id", "status"),)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    chat_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("chats.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # Only meaningful for AI messages; left as ``normal`` for user messages.
    ai_answer_type: Mapped[str] = mapped_column(
        String(16), nullable=False, default=AI_ANSWER_NORMAL
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    chat: Mapped[Chat] = relationship("Chat", back_populates="messages")
    attachments: Mapped[list["Attachment"]] = relationship(
        "Attachment",
        back_populates="message",
        cascade="all, delete-orphan",
        order_by="Attachment.created_at",
    )


class Attachment(Base):
    __tablename__ = "attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    chat_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("chats.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Nullable: an upload can exist briefly before the message that
    # references it is persisted (the route uploads first, then sends).
    message_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(127), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    # Path is stored relative to UPLOAD_DIR so the directory can move
    # without invalidating rows.
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    message: Mapped[Message | None] = relationship("Message", back_populates="attachments")


class Ticket(Base):
    __tablename__ = "tickets"

    case_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    chat_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("chats.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    summary: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    issue_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    priority: Mapped[str | None] = mapped_column(String(16), nullable=True)
    team: Mapped[str | None] = mapped_column(String(64), nullable=True)
    assignee: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default=TICKET_STATUS_NEW)
    labels: Mapped[list | None] = mapped_column(JSON, nullable=True)
    recommended_action: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    chat: Mapped[Chat] = relationship("Chat", back_populates="tickets")

