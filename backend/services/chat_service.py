"""Business logic for chats, messages and tickets.

This layer owns all rules about chat lifecycle, ownership and ticket
creation. Routes should not touch the ORM directly except to look up
entities through these helpers; they should also not duplicate access
control or status-transition checks.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.chat import (
    AI_ANSWER_NORMAL,
    AI_ANSWER_SUMMARY,
    AI_ANSWER_TYPES,
    ISSUE_STATUS_ACTIVE,
    ISSUE_STATUS_CLOSED,
    ISSUE_STATUS_DRAFT,
    ISSUE_STATUS_WAITING_CONFIRMATION,
    SENDER_AI,
    SENDER_USER,
    SENDERS,
    TICKET_STATUS_OPEN,
    Chat,
    Message,
    Ticket,
)


class ChatError(Exception):
    """Raised for chat-related business-rule violations.

    The HTTP layer maps these to 4xx responses. ``http_status`` lets the
    service nudge the controller toward the appropriate code.
    """

    def __init__(self, message: str, http_status: int = 400) -> None:
        super().__init__(message)
        self.http_status = http_status


# ---------------------------------------------------------------------------
# Chat lifecycle
# ---------------------------------------------------------------------------


def create_chat(db: Session, user_id: str) -> Chat:
    chat = Chat(user_id=user_id, status=ISSUE_STATUS_ACTIVE)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


def get_chat_for_user(db: Session, chat_id: str, user_id: str) -> Chat:
    """Fetch a chat, enforcing ownership.

    Raises :class:`ChatError` (404) if the chat does not exist or belongs
    to a different user. We deliberately return 404 for "not yours" to
    avoid leaking the existence of foreign chats.
    """
    chat = db.get(Chat, chat_id)
    if chat is None or chat.user_id != user_id:
        raise ChatError("Chat not found", http_status=404)
    return chat


def list_drafts(db: Session, user_id: str) -> list[Chat]:
    stmt = (
        select(Chat)
        .where(Chat.user_id == user_id, Chat.status == ISSUE_STATUS_DRAFT)
        .order_by(Chat.updated_at.desc())
    )
    return list(db.execute(stmt).scalars())


def list_issues(db: Session, user_id: str) -> list[Chat]:
    stmt = (
        select(Chat)
        .where(Chat.user_id == user_id)
        .order_by(Chat.updated_at.desc(), Chat.created_at.desc())
    )
    return list(db.execute(stmt).scalars())


def mark_as_draft(db: Session, chat_id: str, user_id: str) -> Chat:
    """Demote a chat to ``draft`` if the user navigated away mid-flow.

    Closed chats stay closed; drafts stay drafts (idempotent).
    """
    chat = get_chat_for_user(db, chat_id, user_id)
    if chat.status == ISSUE_STATUS_CLOSED:
        return chat
    if chat.status != ISSUE_STATUS_DRAFT:
        chat.status = ISSUE_STATUS_DRAFT
        db.commit()
        db.refresh(chat)
    return chat


def resume_draft(db: Session, chat_id: str, user_id: str) -> Chat:
    chat = get_chat_for_user(db, chat_id, user_id)
    if chat.status == ISSUE_STATUS_CLOSED:
        raise ChatError("Cannot resume a closed chat", http_status=409)
    if chat.status != ISSUE_STATUS_DRAFT:
        # Resuming a non-draft is a no-op rather than an error so the
        # frontend can call this defensively after reconnects.
        return chat
    chat.status = ISSUE_STATUS_ACTIVE
    db.commit()
    db.refresh(chat)
    return chat


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------


def list_messages(db: Session, chat_id: str, user_id: str) -> list[Message]:
    chat = get_chat_for_user(db, chat_id, user_id)
    stmt = (
        select(Message)
        .where(Message.chat_id == chat.id)
        .order_by(Message.created_at, Message.id)
    )
    return list(db.execute(stmt).scalars())


def add_message(
    db: Session,
    chat: Chat,
    sender: str,
    content: str,
    ai_answer_type: str = AI_ANSWER_NORMAL,
) -> Message:
    if sender not in SENDERS:
        raise ChatError(f"Invalid sender '{sender}'")
    if ai_answer_type not in AI_ANSWER_TYPES:
        raise ChatError(f"Invalid ai_answer_type '{ai_answer_type}'")
    if not content or not content.strip():
        raise ChatError("Message content must not be empty")

    message = Message(
        chat_id=chat.id,
        sender=sender,
        content=content,
        ai_answer_type=ai_answer_type,
    )
    db.add(message)
    # Touch the chat so list_drafts ordering reflects activity.
    chat.updated_at = chat.updated_at  # noqa: PLW0127 - trigger onupdate
    db.commit()
    db.refresh(message)
    db.refresh(chat)
    return message


def assert_can_send_user_message(chat: Chat) -> None:
    """Enforce: users cannot post into closed chats.

    Drafts are auto-resumed by the route layer before calling this, but
    we still guard here in case a caller forgets.
    """
    if chat.status == ISSUE_STATUS_CLOSED:
        raise ChatError("Chat is closed", http_status=409)
    if chat.status == ISSUE_STATUS_DRAFT:
        raise ChatError("Resume the chat before sending messages", http_status=409)


def record_user_message(db: Session, chat: Chat, content: str) -> Message:
    assert_can_send_user_message(chat)
    return add_message(db, chat, sender=SENDER_USER, content=content)


def record_ai_message(
    db: Session, chat: Chat, content: str, answer_type: str
) -> Message:
    message = add_message(
        db, chat, sender=SENDER_AI, content=content, ai_answer_type=answer_type
    )
    if answer_type == AI_ANSWER_SUMMARY:
        chat.status = ISSUE_STATUS_WAITING_CONFIRMATION
        db.commit()
        db.refresh(chat)
    return message


# ---------------------------------------------------------------------------
# Confirmation flow
# ---------------------------------------------------------------------------


def _latest_summary_message(db: Session, chat_id: str) -> Message | None:
    stmt = (
        select(Message)
        .where(
            Message.chat_id == chat_id,
            Message.sender == SENDER_AI,
            Message.ai_answer_type == AI_ANSWER_SUMMARY,
        )
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


def confirm_summary(
    db: Session, chat_id: str, user_id: str, accepted: bool
) -> tuple[Chat, Ticket | None]:
    """Handle the user's Yes/No on a pending summary.

    Returns ``(chat, ticket)``. ``ticket`` is non-None only when
    ``accepted`` is True.
    """
    chat = get_chat_for_user(db, chat_id, user_id)
    if chat.status != ISSUE_STATUS_WAITING_CONFIRMATION:
        raise ChatError(
            "Chat is not waiting for confirmation", http_status=409
        )

    if not accepted:
        chat.status = ISSUE_STATUS_ACTIVE
        db.commit()
        db.refresh(chat)
        return chat, None

    summary_msg = _latest_summary_message(db, chat.id)
    if summary_msg is None:
        # Defensive: the status said waiting_confirmation but no summary
        # message exists. Roll back to active rather than create an empty
        # ticket.
        chat.status = ISSUE_STATUS_ACTIVE
        db.commit()
        raise ChatError("No summary found to confirm", http_status=409)

    ticket = Ticket(
        chat_id=chat.id,
        user_id=chat.user_id,
        summary=summary_msg.content,
        status=TICKET_STATUS_OPEN,
    )
    db.add(ticket)
    chat.status = ISSUE_STATUS_CLOSED
    db.commit()
    db.refresh(ticket)
    db.refresh(chat)
    return chat, ticket
