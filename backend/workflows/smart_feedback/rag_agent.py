import json
import logging
from pathlib import Path

from config import (
    MOCK_MODE,
    WATSONX_API_KEY,
    WATSONX_PROJECT_ID,
    WATSONX_URL,
    WATSONX_EMBEDDING_MODEL_ID,
)

logger = logging.getLogger(__name__)

# Path to the knowledge base loaded by the RAG agent.
# Swap this for a larger document corpus when available.
_KB_PATH = Path(__file__).parent.parent.parent / "data" / "sample_feedback.json"

# Minimum cosine similarity score for a result to be considered relevant.
RELEVANCE_THRESHOLD = 0.3


class RAGAgent:
    """Retrieves documents relevant to a user query.

    In MOCK_MODE it uses simple keyword-overlap scoring so the workflow can
    run without real WatsonX credentials.  In live mode it embeds both the
    query and the knowledge-base documents using the WatsonX embedding model
    defined by WATSONX_EMBEDDING_MODEL_ID and ranks by cosine similarity.
    """

    def __init__(self):
        self.mock_mode = MOCK_MODE
        self._documents: list[dict] = []
        self._embeddings_model = None
        self._doc_vectors = None  # numpy array, shape (n_docs, embedding_dim)

        self._load_documents()
        if not self.mock_mode:
            self._init_embeddings()

    # Initialisation helpers
    def _load_documents(self) -> None:
        """Parse the knowledge-base JSON file into a flat list of documents."""
        try:
            with open(_KB_PATH, "r", encoding="utf-8") as fh:
                raw: list[dict] = json.load(fh)

            for item in raw:
                for msg in item.get("conversation", []):
                    if msg.get("sender") == "user":
                        self._documents.append(
                            {
                                "text": msg["content"],
                                "source": item.get("case_id", "unknown"),
                                "metadata": {
                                    "intent": item.get("labels", {}).get("intent", ""),
                                    "severity": item.get("labels", {}).get("severity", ""),
                                },
                            }
                        )
            logger.info("RAGAgent: loaded %d documents.", len(self._documents))
        except Exception as exc:
            logger.error("RAGAgent: failed to load documents: %s", exc)

    def _init_embeddings(self) -> None:
        """Embed all documents at startup so search is fast at query time."""
        try:
            import numpy as np
            from langchain_ibm import WatsonxEmbeddings

            self._embeddings_model = WatsonxEmbeddings(
                model_id=WATSONX_EMBEDDING_MODEL_ID,
                url=WATSONX_URL,
                apikey=WATSONX_API_KEY,
                project_id=WATSONX_PROJECT_ID,
            )

            texts = [d["text"] for d in self._documents]
            if texts:
                vecs = self._embeddings_model.embed_documents(texts)
                self._doc_vectors = np.array(vecs, dtype=float)
                logger.info("RAGAgent: pre-embedded %d documents.", len(texts))
        except Exception as exc:
            logger.error("RAGAgent: failed to initialise embeddings: %s", exc)
            self._embeddings_model = None
            self._doc_vectors = None

    # Search
    def search(self, query: str, top_k: int = 3) -> list[dict]:
        """Return the top-k most relevant documents for *query*.

        Each result dict contains: text, score (float 0-1), source, metadata.
        """
        if self.mock_mode or self._embeddings_model is None:
            return self._keyword_search(query, top_k)
        return self._embedding_search(query, top_k)

    def _keyword_search(self, query: str, top_k: int) -> list[dict]:
        """Keyword-overlap scoring — used in mock mode."""
        query_terms = set(query.lower().split())
        results: list[dict] = []

        for doc in self._documents:
            doc_terms = set(doc["text"].lower().split())
            overlap = len(query_terms & doc_terms)
            score = overlap / max(len(query_terms), 1)
            results.append(
                {
                    "text": doc["text"],
                    "score": round(score, 3),
                    "source": doc["source"],
                    "metadata": doc["metadata"],
                }
            )

        results.sort(key=lambda r: r["score"], reverse=True)
        return results[:top_k]

    def _embedding_search(self, query: str, top_k: int) -> list[dict]:
        """Cosine-similarity search using WatsonX embeddings."""
        try:
            import numpy as np

            query_vec = np.array(
                self._embeddings_model.embed_query(query), dtype=float
            )

            scores: list[float] = []
            for doc_vec in self._doc_vectors:
                norm = float(np.linalg.norm(query_vec) * np.linalg.norm(doc_vec))
                scores.append(float(np.dot(query_vec, doc_vec)) / norm if norm else 0.0)

            top_indices = sorted(
                range(len(scores)), key=lambda i: scores[i], reverse=True
            )[:top_k]

            return [
                {
                    "text": self._documents[i]["text"],
                    "score": round(scores[i], 3),
                    "source": self._documents[i]["source"],
                    "metadata": self._documents[i]["metadata"],
                }
                for i in top_indices
            ]
        except Exception as exc:
            logger.error("RAGAgent._embedding_search failed: %s — using keyword fallback.", exc)
            return self._keyword_search(query, top_k)
