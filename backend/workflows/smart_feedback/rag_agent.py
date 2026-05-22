import logging

from sqlalchemy import text

from config import (
    MOCK_MODE,
    RAG_KEYWORD_FALLBACK_SCORE,
    RAG_RELEVANCE_THRESHOLD,
    WATSONX_API_KEY,
    WATSONX_EMBEDDING_MODEL_ID,
    WATSONX_PROJECT_ID,
    WATSONX_URL,
)
from db import SessionLocal

logger = logging.getLogger(__name__)

# Minimum cosine similarity to consider a question "already answered".
# Below this threshold the triage agent takes over.
RELEVANCE_THRESHOLD = RAG_RELEVANCE_THRESHOLD


class RAGAgent:
    """Q&A lookup against the rag_chunks pgvector table.

    Embeds the incoming user query, finds the most similar past question,
    and returns the answer that was stored for that question — no generation
    needed. If nothing is similar enough, the triage agent handles the request.

    Each result contains:
      question_text — the matched past question
      answer_text   — the answer to return directly
      score         — cosine similarity (0–1)
      source_type   — "policy" or "ticket"
      doc_id / doc_version / chunk_id  (policy rows)
      case_id                          (ticket rows)
      language, department, severity, intent
    """

    def __init__(self):
        self._embeddings_model = None
        if not MOCK_MODE:
            self._init_embeddings()

    def _init_embeddings(self) -> None:
        try:
            from langchain_ibm import WatsonxEmbeddings
            self._embeddings_model = WatsonxEmbeddings(
                model_id=WATSONX_EMBEDDING_MODEL_ID,
                url=WATSONX_URL,
                apikey=WATSONX_API_KEY,
                project_id=WATSONX_PROJECT_ID,
            )
            logger.info("RAGAgent: embeddings initialised.")
        except Exception as exc:
            logger.error("RAGAgent: failed to initialise embeddings: %s", exc)

    def search(self, query: str, top_k: int = 3) -> list[dict]:
        """Return up to top_k answers for similar past questions.

        Returns an empty list if no match exceeds RELEVANCE_THRESHOLD,
        signalling the triage agent to handle the request.
        """
        if MOCK_MODE or self._embeddings_model is None:
            return self._keyword_search(query, top_k)
        # Vector search on rag_chunks + keyword search on tickets (no ticket embeddings)
        vector_results = self._vector_search(query, top_k)
        ticket_results = self._ticket_keyword_search(query, top_k)
        combined = vector_results + ticket_results
        combined.sort(key=lambda r: r["score"], reverse=True)
        return combined[:top_k]

    # Vector search (live mode)
    def _vector_search(self, query: str, top_k: int) -> list[dict]:
        try:
            query_vec = self._embeddings_model.embed_query(query)
            vec_str = "[" + ",".join(str(v) for v in query_vec) + "]"

            # Search both question and answer embeddings; take the best score.
            # question_embedding match → user phrased query like a past question
            # answer_embedding match   → user used terminology from the answer
            sql_chunks = text("""
                SELECT
                    question_text,
                    answer_text,
                    source_type,
                    doc_id,
                    doc_version,
                    chunk_id,
                    case_id,
                    language,
                    department,
                    severity,
                    intent,
                    GREATEST(
                        1 - (question_embedding <=> CAST(:vec AS vector)),
                        1 - (answer_embedding   <=> CAST(:vec AS vector))
                    ) AS score,
                    CASE
                        WHEN (1 - (question_embedding <=> CAST(:vec AS vector))) >=
                             (1 - (answer_embedding   <=> CAST(:vec AS vector)))
                        THEN 'question' ELSE 'answer'
                    END AS matched_on
                FROM rag_chunks
                WHERE GREATEST(
                    1 - (question_embedding <=> CAST(:vec AS vector)),
                    1 - (answer_embedding   <=> CAST(:vec AS vector))
                ) >= :threshold
                ORDER BY score DESC
                LIMIT :top_k
            """)

            sql_tickets = text("""
                SELECT
                    summary              AS question_text,
                    response             AS answer_text,
                    'ticket'             AS source_type,
                    NULL                 AS doc_id,
                    NULL                 AS doc_version,
                    NULL                 AS chunk_id,
                    case_id,
                    NULL                 AS language,
                    team                 AS department,
                    priority             AS severity,
                    issue_type           AS intent,
                    1 - (summary_embedding <=> CAST(:vec AS vector)) AS score,
                    'summary'            AS matched_on
                FROM tickets
                WHERE status IN ('Resolved', 'Done')
                  AND summary_embedding IS NOT NULL
                  AND response IS NOT NULL
                  AND 1 - (summary_embedding <=> CAST(:vec AS vector)) >= :threshold
                ORDER BY score DESC
                LIMIT :top_k
            """)

            db = SessionLocal()
            try:
                chunk_rows = db.execute(sql_chunks, {
                    "vec": vec_str,
                    "threshold": RELEVANCE_THRESHOLD,
                    "top_k": top_k,
                }).fetchall()
                ticket_rows = db.execute(sql_tickets, {
                    "vec": vec_str,
                    "threshold": RELEVANCE_THRESHOLD,
                    "top_k": top_k,
                }).fetchall()
            finally:
                db.close()

            results = [self._row_to_dict(r) for r in chunk_rows + ticket_rows]
            results.sort(key=lambda r: r["score"], reverse=True)
            # Deduplicate by case_id, keeping the highest-scoring entry per ticket
            seen_case_ids: set[str] = set()
            deduped = []
            for r in results:
                cid = r.get("case_id")
                if cid and cid in seen_case_ids:
                    continue
                if cid:
                    seen_case_ids.add(cid)
                deduped.append(r)
            return deduped[:top_k]

        except Exception as exc:
            logger.error("RAGAgent._vector_search failed: %s — falling back to keyword.", exc)
            return self._keyword_search(query, top_k)

    # Keyword search (mock / fallback)
    def _keyword_search(self, query: str, top_k: int) -> list[dict]:
        words = [w.strip() for w in query.split() if len(w.strip()) > 2]
        if not words:
            return []

        like_clauses = " OR ".join(
            f"question_text ILIKE :w{i} OR answer_text ILIKE :w{i}"
            for i in range(len(words))
        )
        params: dict = {"top_k": top_k}
        for i, w in enumerate(words):
            params[f"w{i}"] = f"%{w}%"

        sql_chunks = text(f"""
            SELECT
                question_text,
                answer_text,
                source_type,
                doc_id,
                doc_version,
                chunk_id,
                case_id,
                language,
                department,
                severity,
                intent,
                :fallback_score AS score,
                'keyword' AS matched_on
            FROM rag_chunks
            WHERE {like_clauses}
            LIMIT :top_k
        """)
        params["fallback_score"] = RAG_KEYWORD_FALLBACK_SCORE

        db = SessionLocal()
        try:
            chunk_rows = db.execute(sql_chunks, params).fetchall()
        finally:
            db.close()

        results = [self._row_to_dict(r) for r in chunk_rows]
        results += self._ticket_keyword_search(query, top_k)
        results.sort(key=lambda r: r["score"], reverse=True)
        return results[:top_k]

    def _ticket_keyword_search(self, query: str, top_k: int) -> list[dict]:
        words = [w.strip() for w in query.split() if len(w.strip()) > 2]
        if not words:
            return []

        ticket_like_clauses = " OR ".join(
            f"summary ILIKE :w{i} OR description ILIKE :w{i}"
            for i in range(len(words))
        )
        params: dict = {"top_k": top_k}
        for i, w in enumerate(words):
            params[f"w{i}"] = f"%{w}%"

        sql_tickets = text(f"""
            SELECT
                summary            AS question_text,
                response          AS answer_text,
                recommended_action,
                'ticket'           AS source_type,
                NULL               AS doc_id,
                NULL               AS doc_version,
                NULL               AS chunk_id,
                case_id,
                NULL               AS language,
                team               AS department,
                priority           AS severity,
                issue_type         AS intent,
                0.6                AS score,
                'keyword'          AS matched_on
            FROM tickets
            WHERE response IS NOT NULL
              AND status IN ('Resolved', 'Done')
              AND ({ticket_like_clauses})
            LIMIT :top_k
        """)

        db = SessionLocal()
        try:
            rows = db.execute(sql_tickets, params).fetchall()
        finally:
            db.close()

        return [self._row_to_dict(r) for r in rows]

    @staticmethod
    def _row_to_dict(row) -> dict:
        return {
            "question_text": row.question_text,
            "answer_text": row.answer_text,
            "score": round(float(row.score), 3),
            "matched_on": row.matched_on,   # "question" | "answer" | "keyword"
            "source_type": row.source_type,
            "doc_id": row.doc_id,
            "doc_version": row.doc_version,
            "chunk_id": row.chunk_id,
            "case_id": row.case_id,
            "language": row.language,
            "department": row.department,
            "severity": row.severity,
            "intent": row.intent,
        }
