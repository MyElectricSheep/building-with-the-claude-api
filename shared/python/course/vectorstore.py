"""A minimal in-memory vector index (lessons 35-38).

The one thing it does beyond storing arrays: it records the embedding model and
dimension it was built with, and refuses a query vector from a different space.
Mixing vectors from two models produces no error and nonsense rankings, which is
a genuinely hard bug to spot.
"""

from __future__ import annotations

from course.chunking import Chunk
from course.retrieval import Scored, dot_product, top_k


class VectorIndex:
    def __init__(self, model: str) -> None:
        self.model = model
        self._chunks: list[Chunk] = []
        self._vectors: list[list[float]] = []
        self._dimension: int | None = None

    def add(self, chunks: list[Chunk], vectors: list[list[float]]) -> None:
        if len(chunks) != len(vectors):
            raise ValueError(
                f"Mismatched batch: {len(chunks)} chunks, {len(vectors)} vectors"
            )
        for chunk, vector in zip(chunks, vectors, strict=True):
            if self._dimension is None:
                self._dimension = len(vector)
            elif len(vector) != self._dimension:
                raise ValueError(
                    f"Dimension mismatch: index is {self._dimension}, "
                    f"vector is {len(vector)}"
                )
            self._chunks.append(chunk)
            self._vectors.append(vector)

    def search(
        self,
        query_vector: list[float],
        k: int = 3,
        query_model: str | None = None,
    ) -> list[Scored[Chunk]]:
        """Search.

        ``query_model`` is checked against the index's model: an index is
        versioned by the embedding model that built it.
        """
        if query_model is not None and query_model != self.model:
            raise ValueError(
                f"Index was built with {self.model} but the query was embedded "
                f"with {query_model}. Rebuild the index; vectors from two "
                f"models are not comparable."
            )
        if self._dimension is not None and len(query_vector) != self._dimension:
            raise ValueError(
                f"Dimension mismatch: index is {self._dimension}, "
                f"query is {len(query_vector)}"
            )
        # Voyage vectors are L2-normalised, so a dot product ranks identically
        # to cosine similarity and is cheaper.
        scored = [
            Scored(chunk, dot_product(vector, query_vector))
            for chunk, vector in zip(self._chunks, self._vectors, strict=True)
        ]
        return top_k(scored, k)

    def __len__(self) -> int:
        return len(self._chunks)
