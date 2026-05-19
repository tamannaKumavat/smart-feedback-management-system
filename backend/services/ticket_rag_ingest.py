from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from config import (
    MOCK_MODE,
    WATSONX_API_KEY,
    WATSONX_EMBEDDING_MODEL_ID,
    WATSONX_PROJECT_ID,
    WATSONX_URL,
)
from models.chat import TICKET_EMBEDDING_DIM, Ticket
from models.rag import EMBEDDING_DIM, RagChunk

log = logging.getLogger(__name__)

DONE_STATUSES = {"done", "resolved", "closed"}


def is_done_status(status: str | None) -> bool:
    return (status or "").strip().lower() in DONE_STATUSES


def _label_value(labels: list[Any] | None, prefix: str) -> str | None:
    if not labels:
        return None
    for label in labels:
        label_text = str(label)
        if label_text.startswith(prefix):
            return label_text.removeprefix(prefix)
    return None


def _ticket_question_text(ticket: Ticket) -> str:
    parts = [
        ticket.summary,
        ticket.description or "",
    ]
    return "\n\n".join(part.strip() for part in parts if part and part.strip())


def _ticket_answer_text(ticket: Ticket) -> str:
    response_text = _ticket_response_text(ticket)
    if response_text:
        return response_text
    return (
        f"Recommended action: {ticket.recommended_action}"
        if ticket.recommended_action
        else ""
    )


def _ticket_response_text(ticket: Ticket) -> str:
    comment_bodies = [
        str(comment.get("body", "")).strip()
        for comment in (ticket.response_comments or [])
        if isinstance(comment, dict) and str(comment.get("body", "")).strip()
    ]
    if comment_bodies:
        return "\n\n".join(comment_bodies)
    return (ticket.response or "").strip()


def _embed_texts(texts: list[str], label: str) -> list[list[float]]:
    if MOCK_MODE:
        log.warning("MOCK_MODE: using zero vectors for %s.", label)
        return [[0.0] * EMBEDDING_DIM for _ in texts]

    from langchain_ibm import WatsonxEmbeddings

    model = WatsonxEmbeddings(
        model_id=WATSONX_EMBEDDING_MODEL_ID,
        url=WATSONX_URL,
        apikey=WATSONX_API_KEY,
        project_id=WATSONX_PROJECT_ID,
    )
    return model.embed_documents(texts)


def _embed_pair(question: str, answer: str) -> tuple[list[float], list[float]]:
    question_vec, answer_vec = _embed_texts([question, answer], "resolved ticket RAG chunk")
    return question_vec, answer_vec


def upsert_done_ticket_rag_chunk(db: Session, ticket: Ticket) -> dict[str, Any]:
    if not is_done_status(ticket.status):
        return {
            "upserted": False,
            "reason": "ticket is not done",
            "case_id": ticket.case_id,
            "status": ticket.status,
        }

    question = _ticket_question_text(ticket)
    answer = _ticket_answer_text(ticket)
    if not question or not answer:
        return {
            "upserted": False,
            "reason": "ticket does not have enough text to embed",
            "case_id": ticket.case_id,
        }

    question_vec, answer_vec = _embed_pair(question, answer)
    summary_text = (ticket.summary or "").strip()
    response_text = _ticket_response_text(ticket)
    if summary_text and response_text:
        summary_vec, response_vec = _embed_texts(
            [summary_text, response_text],
            "ticket summary/response",
        )
        if len(summary_vec) == TICKET_EMBEDDING_DIM:
            ticket.summary_embedding = summary_vec
        if len(response_vec) == TICKET_EMBEDDING_DIM:
            ticket.response_embedding = response_vec

    deleted = (
        db.query(RagChunk)
        .filter(RagChunk.source_type == "ticket", RagChunk.case_id == ticket.case_id)
        .delete(synchronize_session=False)
    )
    db.add(
        RagChunk(
            question_text=question,
            question_embedding=question_vec,
            answer_text=answer,
            answer_embedding=answer_vec,
            source_type="ticket",
            case_id=ticket.case_id,
            is_gold=True,
            language=_label_value(ticket.labels, "language_"),
            department=ticket.team,
            severity=_label_value(ticket.labels, "severity_"),
            intent=_label_value(ticket.labels, "intent_"),
        )
    )
    db.commit()
    return {
        "upserted": True,
        "case_id": ticket.case_id,
        "deleted_existing": deleted,
    }
