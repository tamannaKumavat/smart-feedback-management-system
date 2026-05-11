"""Business logic for Issues, messages and tickets.

This layer owns all rules about Issue lifecycle, ownership and ticket
creation. Routes should not touch the ORM directly except to look up
entities through these helpers.
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
    Issue,
    Message,
    Ticket,
)


class ChatError(Exception):
    """Raised for Issue-related business-rule violations.

    The HTTP layer maps these to 4xx responses.
    """

    def __init__(self, message: str, http_status: int = 400) -> None:
        super().__init__(message)
        self.http_status = http_status


# ---------------------------------------------------------------------------
# Issue lifecycle
# ---------------------------------------------------------------------------


def create_chat(db: Session, user_id: str) -> Issue:
    issue = Issue(user_id=user_id, status=ISSUE_STATUS_ACTIVE)
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue


def get_chat_for_user(db: Session, issue_id: str, user_id: str) -> Issue:
    """Fetch an Issue, enforcing ownership.

    Raises :class:`ChatError` (404) if not found or owned by another user.
    """
    issue = db.get(Issue, issue_id)
    if issue is None or issue.user_id != user_id:
        raise ChatError("Issue not found", http_status=404)
    return issue


def list_drafts(db: Session, user_id: str) -> list[Issue]:
    stmt = (
        select(Issue)
        .where(Issue.user_id == user_id, Issue.status == ISSUE_STATUS_DRAFT)
        .order_by(Issue.updated_at.desc())
    )
    return list(db.execute(stmt).scalars())


def list_issues(db: Session, user_id: str) -> list[Issue]:
    stmt = (
        select(Issue)
        .where(Issue.user_id == user_id)
        .order_by(Issue.updated_at.desc(), Issue.created_at.desc())
    )
    return list(db.execute(stmt).scalars())


def mark_as_draft(db: Session, issue_id: str, user_id: str) -> Issue:
    """Demote an Issue to ``draft`` if the user navigated away mid-flow."""
    issue = get_chat_for_user(db, issue_id, user_id)
    if issue.status == ISSUE_STATUS_CLOSED:
        return issue
    if issue.status != ISSUE_STATUS_DRAFT:
        issue.status = ISSUE_STATUS_DRAFT
        db.commit()
        db.refresh(issue)
    return issue


def resume_draft(db: Session, issue_id: str, user_id: str) -> Issue:
    issue = get_chat_for_user(db, issue_id, user_id)
    if issue.status == ISSUE_STATUS_CLOSED:
        raise ChatError("Cannot resume a closed Issue", http_status=409)
    if issue.status != ISSUE_STATUS_DRAFT:
        return issue
    issue.status = ISSUE_STATUS_ACTIVE
    db.commit()
    db.refresh(issue)
    return issue


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------


def list_messages(db: Session, issue_id: str, user_id: str) -> list[Message]:
    get_chat_for_user(db, issue_id, user_id)
    stmt = (
        select(Message)
        .where(Message.issue_id == issue_id)
        .order_by(Message.created_at, Message.id)
    )
    return list(db.execute(stmt).scalars())


def add_message(
    db: Session,
    issue: Issue,
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
        issue_id=issue.id,
        sender=sender,
        content=content,
        ai_answer_type=ai_answer_type,
    )
    db.add(message)
    issue.updated_at = issue.updated_at  # noqa: PLW0127 - trigger onupdate
    db.commit()
    db.refresh(message)
    db.refresh(issue)
    return message


def assert_can_send_user_message(issue: Issue) -> None:
    if issue.status == ISSUE_STATUS_CLOSED:
        raise ChatError("Issue is closed", http_status=409)
    if issue.status == ISSUE_STATUS_DRAFT:
        raise ChatError("Resume the Issue before sending messages", http_status=409)


def record_user_message(db: Session, issue: Issue, content: str) -> Message:
    assert_can_send_user_message(issue)
    return add_message(db, issue, sender=SENDER_USER, content=content)


def record_ai_message(
    db: Session, issue: Issue, content: str, answer_type: str
) -> Message:
    message = add_message(
        db, issue, sender=SENDER_AI, content=content, ai_answer_type=answer_type
    )
    if answer_type == AI_ANSWER_SUMMARY:
        issue.status = ISSUE_STATUS_WAITING_CONFIRMATION
        db.commit()
        db.refresh(issue)
    return message


# ---------------------------------------------------------------------------
# Confirmation flow
# ---------------------------------------------------------------------------


def _latest_summary_message(db: Session, issue_id: str) -> Message | None:
    stmt = (
        select(Message)
        .where(
            Message.issue_id == issue_id,
            Message.sender == SENDER_AI,
            Message.ai_answer_type == AI_ANSWER_SUMMARY,
        )
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


def confirm_summary(
    db: Session, issue_id: str, user_id: str, accepted: bool
) -> tuple[Issue, Ticket | None]:
    """Handle the user's Yes/No on a pending summary."""
    issue = get_chat_for_user(db, issue_id, user_id)
    if issue.status != ISSUE_STATUS_WAITING_CONFIRMATION:
        raise ChatError("Issue is not waiting for confirmation", http_status=409)

    if not accepted:
        issue.status = ISSUE_STATUS_ACTIVE
        db.commit()
        db.refresh(issue)
        return issue, None

    summary_msg = _latest_summary_message(db, issue.id)
    if summary_msg is None:
        issue.status = ISSUE_STATUS_ACTIVE
        db.commit()
        raise ChatError("No summary found to confirm", http_status=409)

    ticket = Ticket(
        issue_id=issue.id,
        user_id=issue.user_id,
        summary=summary_msg.content,
        status=TICKET_STATUS_OPEN,
    )
    db.add(ticket)
    issue.status = ISSUE_STATUS_CLOSED
    db.commit()
    db.refresh(ticket)
    db.refresh(issue)
    return issue, ticket


def update_ticket(
    db: Session,
    ticket_id: str,
    user_id: str,
    status: str | None = None,
    summary: str | None = None,
) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise ChatError("Ticket not found", http_status=404)
    if ticket.user_id != user_id:
        raise ChatError("Not authorized to update this ticket", http_status=403)
    if status is not None:
        ticket.status = status
    if summary is not None:
        ticket.summary = summary
    db.commit()
    db.refresh(ticket)
    return ticket
