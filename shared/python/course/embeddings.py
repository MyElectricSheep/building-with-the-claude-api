"""Voyage AI embeddings for the RAG lessons (34-38).

Anthropic does not ship an embedding model; the documentation points at Voyage
AI, which has an official Python package.

Two corrections to the Academy version, both from current documentation:

  1. ``voyage-3-large`` is previous-generation. Voyage 4 is current.
  2. ``input_type`` is NOT optional and NOT the same for both sides of a
     retrieval task: chunks are ``"document"``, searches are ``"query"``. The
     course helper defaults everything to one value, which quietly degrades
     recall.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from course.config import EMBEDDING_MODEL, require_env

InputType = Literal["document", "query"]


@dataclass(frozen=True)
class EmbedResult:
    embeddings: list[list[float]]
    model: str
    total_tokens: int


def _client():  # noqa: ANN202
    import voyageai

    require_env("VOYAGE_API_KEY")
    return voyageai.Client()


def embed(
    texts: list[str],
    input_type: InputType,
    model: str = EMBEDDING_MODEL,
) -> EmbedResult:
    """Embed a batch of texts.

    Batch. The Academy's implementation embeds chunks one at a time, which is
    both slower and more expensive in request overhead for no benefit.
    """
    if not texts:
        return EmbedResult([], model, 0)

    result = _client().embed(texts, model=model, input_type=input_type)
    return EmbedResult(
        embeddings=result.embeddings,
        model=model,
        total_tokens=result.total_tokens,
    )


def embed_document(text: str, model: str = EMBEDDING_MODEL) -> list[float]:
    """Embed one document chunk. Prefer ``embed`` for a batch."""
    return embed([text], "document", model).embeddings[0]


def embed_query(text: str, model: str = EMBEDDING_MODEL) -> list[float]:
    """Embed a search query. Note the input type - this is the lesson-34 trap."""
    return embed([text], "query", model).embeddings[0]


@dataclass(frozen=True)
class RerankHit:
    index: int
    relevance_score: float


def rerank(
    query: str,
    documents: list[str],
    top_k: int = 5,
    model: str = "rerank-2.5-lite",
) -> list[RerankHit]:
    """Rerank candidates against a query with a cross-encoder.

    A reranker reads the query and each document *together*, so it is much more
    accurate than comparing two independently-computed vectors - and much too
    slow to run over a whole corpus. Retrieve cheaply, then rerank the shortlist.
    """
    if not documents:
        return []
    result = _client().rerank(
        query, documents, model=model, top_k=min(top_k, len(documents))
    )
    return [
        RerankHit(index=item.index, relevance_score=item.relevance_score)
        for item in result.results
    ]
