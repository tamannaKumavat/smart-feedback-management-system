from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from db import Base

# Dimension of ibm/granite-embedding-278m-multilingual
EMBEDDING_DIM = 768


def _new_uuid() -> str:
    return str(uuid4())


class RagChunk(Base):
    """Q&A lookup table for the RAG agent.

    Each row stores a past user question (embedded) paired with the correct
    answer to return. At search time the incoming query is embedded and the
    nearest question embedding is found; the stored answer_text is returned
    directly without any further generation.

    question_text  — what the user asked (this is what gets embedded)
    answer_text    — the correct answer to return when this question is matched
                     (gold policy chunk text from data.jsonl, or ticket resolution)

    source_type:
      "policy"  — answer comes from a verified policy document chunk
      "ticket"  — answer comes from a resolved support ticket
    """

    __tablename__ = "rag_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)

    # The past user question — embedded and searched against
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIM), nullable=False)

    # The correct answer to return when this question is matched
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    answer_embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIM), nullable=False)

    # "policy" or "ticket"
    source_type: Mapped[str] = mapped_column(String(16), nullable=False)

    # Citation — where the answer came from
    doc_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    doc_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    chunk_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    case_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # True if this chunk appears in gold_supporting_doc_ids (verified correct)
    is_gold: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Metadata for context / filtering
    language: Mapped[str | None] = mapped_column(String(16), nullable=True)
    department: Mapped[str | None] = mapped_column(String(128), nullable=True)
    severity: Mapped[str | None] = mapped_column(String(8), nullable=True)
    intent: Mapped[str | None] = mapped_column(String(128), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
