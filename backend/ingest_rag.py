"""Ingest Q&A pairs into the rag_chunks pgvector table.

Each row stores:
  - question_text + question_embedding  (what the user asked)
  - answer_text   + answer_embedding    (the correct policy chunk to return)

Searching both embeddings at query time gives the best coverage:
  - question_embedding match → user phrased their query like a past question
  - answer_embedding match   → user used terminology that appears in the answer

Sources:
  1. data/data.jsonl            — user question + gold policy chunk as answer
  2. data/sample_feedback.json  — resolved tickets with user question + agent answer

Run from the backend directory:
    python ingest_rag.py [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

import numpy as np

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

JSONL_PATH = Path(__file__).parent / "data" / "data.jsonl"
# TICKETS_PATH = Path(__file__).parent / "data" / "sample_feedback.json"

# Priority-ordered field names for each slot across all record variants
_QUESTION_FIELDS = ("content", "text", "utterance", "message")
# _ANSWER_FIELDS = ("content", "text", "utterance", "message")  # used by _extract_from_tickets
_CHUNK_FIELDS    = (
    "snippet", "text", "text_snippet", "content_excerpt",
    "content_snippet", "chunk_text", "text_excerpt", "content",
)


def _pick(d: dict, fields: tuple[str, ...]) -> str:
    """Return the first non-empty value found among the given field names."""
    for f in fields:
        v = d.get(f, "")
        if isinstance(v, str) and v.strip():
            return v.strip()
    return ""


# Extraction
def _extract_from_jsonl(path: Path) -> list[dict]:
    """One row per (user_question, retrieved_chunk) pair from every record.

    question_text = what the user asked (embedded)
    answer_text   = the retrieved policy chunk (embedded + returned)

    Gold chunks are flagged with is_gold=True so the search can surface them
    first, but all chunks are indexed so no data is dropped.
    Records with no question or no retrieved chunks are skipped.
    """
    pairs: list[dict] = []
    seen: set[tuple[str, str]] = set()  # (question_text, answer_text)
    skipped_dupes = 0

    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            item = json.loads(line)

            # User question — first user turn in the conversation
            question = ""
            for turn in item.get("conversation", {}).get("turns", []):
                sender = turn.get("sender") or turn.get("speaker", "")
                if sender == "user":
                    question = _pick(turn, _QUESTION_FIELDS)
                    break
            if not question:
                continue

            rag = item.get("rag", {})

            # Gold IDs used to flag (not filter) chunks
            raw_gold = rag.get("gold_supporting_doc_ids", [])
            gold_ids = set(
                g["doc_id"] if isinstance(g, dict) else g
                for g in raw_gold
            )

            # Retrieved chunks — handle both schema variants
            retrieval = rag.get("retrieval")
            raw_chunks = (
                rag.get("retrieved_chunks")
                or (retrieval.get("retrieved_chunks", []) if isinstance(retrieval, dict) else [])
                or []
            )
            if not raw_chunks:
                continue

            labels = item.get("labels", {})
            base = {
                "source_type": "policy",
                "question_text": question,
                "language": item.get("meta", {}).get("language"),
                "department": item.get("persona", {}).get("department"),
                "severity": labels.get("severity"),
                "intent": labels.get("intent"),
                "case_id": item.get("case_id"),
            }

            for chunk in raw_chunks:
                answer = _pick(chunk, _CHUNK_FIELDS)
                if not answer:
                    continue
                key = (question, answer)
                if key in seen:
                    skipped_dupes += 1
                    continue
                seen.add(key)
                doc_id = chunk.get("doc_id", "")
                pairs.append({
                    **base,
                    "answer_text": answer,
                    "doc_id": doc_id,
                    "doc_version": chunk.get("version") or chunk.get("doc_version"),
                    "chunk_id": chunk.get("chunk_id"),
                    "is_gold": doc_id in gold_ids,
                })

    log.info("Extracted %d unique Q&A pairs from %s (skipped %d duplicates)",
             len(pairs), path.name, skipped_dupes)
    return pairs


# def _extract_from_tickets(path: Path) -> list[dict]:
#     """Resolved tickets where both a user question and agent answer exist."""
#     pairs: list[dict] = []
#
#     with open(path, encoding="utf-8") as fh:
#         tickets = json.load(fh)
#
#     for ticket in tickets:
#         question = ""
#         answer = ""
#         for turn in ticket.get("conversation", []):
#             sender = turn.get("sender", "")
#             if sender == "user" and not question:
#                 question = _pick(turn, _QUESTION_FIELDS)
#             elif sender in ("assistant", "agent") and not answer:
#                 answer = _pick(turn, _ANSWER_FIELDS)
#
#         if not question or not answer:
#             continue
#
#         labels = ticket.get("labels", {})
#         pairs.append({
#             "source_type": "ticket",
#             "question_text": question,
#             "answer_text": answer,
#             "doc_id": None,
#             "doc_version": None,
#             "chunk_id": None,
#             "case_id": ticket.get("case_id"),
#             "language": ticket.get("language"),
#             "department": None,
#             "severity": labels.get("severity"),
#             "intent": labels.get("intent"),
#         })
#
#     log.info("Extracted %d resolved ticket pairs from %s", len(pairs), path.name)
#     return pairs


# Embedding
def _embed(texts: list[str], mock: bool, label: str = "") -> list[list[float]]:
    from models.rag import EMBEDDING_DIM

    if mock:
        log.warning("MOCK_MODE: using zero vectors for %s.", label)
        return [np.zeros(EMBEDDING_DIM).tolist() for _ in texts]

    from config import (
        WATSONX_API_KEY,
        WATSONX_EMBEDDING_MODEL_ID,
        WATSONX_PROJECT_ID,
        WATSONX_URL,
    )
    from langchain_ibm import WatsonxEmbeddings

    model = WatsonxEmbeddings(
        model_id=WATSONX_EMBEDDING_MODEL_ID,
        url=WATSONX_URL,
        apikey=WATSONX_API_KEY,
        project_id=WATSONX_PROJECT_ID,
    )

    batch_size = 20
    total_batches = -(-len(texts) // batch_size)
    all_vectors: list[list[float]] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i: i + batch_size]
        log.info("Embedding %s batch %d/%d ...", label, i // batch_size + 1, total_batches)
        all_vectors.extend(model.embed_documents(batch))

    return all_vectors

# Main
def main(dry_run: bool = False) -> None:
    from config import MOCK_MODE
    from db import Base, SessionLocal, engine
    from models.rag import RagChunk

    Base.metadata.create_all(bind=engine)

    policy_pairs = _extract_from_jsonl(JSONL_PATH)
    # ticket_pairs = _extract_from_tickets(TICKETS_PATH)
    all_pairs = policy_pairs  # + ticket_pairs

    log.info("Total pairs to ingest: %d", len(all_pairs))

    if not all_pairs:
        log.error("No pairs extracted — check data file paths.")
        sys.exit(1)

    if dry_run:
        log.info("Dry run — first 3 pairs:")
        for p in all_pairs[:3]:
            log.info(
                "  [%s] Q: %s... | A: %s...",
                p["source_type"],
                p["question_text"][:60],
                p["answer_text"][:60],
            )
        return

    questions = [p["question_text"] for p in all_pairs]
    answers   = [p["answer_text"]   for p in all_pairs]

    q_vectors = _embed(questions, mock=MOCK_MODE, label="questions")
    a_vectors = _embed(answers,   mock=MOCK_MODE, label="answers")

    db = SessionLocal()
    try:
        deleted = db.query(RagChunk).delete()
        log.info("Cleared %d existing rows.", deleted)

        for pair, q_vec, a_vec in zip(all_pairs, q_vectors, a_vectors):
            db.add(RagChunk(
                question_text=pair["question_text"],
                question_embedding=q_vec,
                answer_text=pair["answer_text"],
                answer_embedding=a_vec,
                source_type=pair["source_type"],
                doc_id=pair.get("doc_id"),
                doc_version=pair.get("doc_version"),
                chunk_id=pair.get("chunk_id"),
                is_gold=pair.get("is_gold", False),
                case_id=pair.get("case_id"),
                language=pair.get("language"),
                department=pair.get("department"),
                severity=pair.get("severity"),
                intent=pair.get("intent"),
            ))

        db.commit()
        log.info("Saved %d Q&A pairs to rag_chunks.", len(all_pairs))
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    main(dry_run=args.dry_run)
