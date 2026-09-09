"""Retrieval primitives for lessons 34-38. Pure functions - no network.

Voyage embeddings are L2-normalised, so a dot product ranks identically to
cosine similarity and is cheaper. ``cosine_similarity`` is kept for vectors from
other providers that are not normalised.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T")

_TOKEN_SPLIT = re.compile(r"[^\w]+", re.UNICODE)


def dot_product(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        raise ValueError(f"Dimension mismatch: {len(a)} vs {len(b)}")
    return sum(x * y for x, y in zip(a, b, strict=True))


def cosine_similarity(a: list[float], b: list[float]) -> float:
    norm = math.sqrt(dot_product(a, a)) * math.sqrt(dot_product(b, b))
    return 0.0 if norm == 0 else dot_product(a, b) / norm


@dataclass(frozen=True)
class Scored(Generic[T]):
    item: T
    score: float


def top_k(scored: list[Scored[T]], k: int) -> list[Scored[T]]:
    return sorted(scored, key=lambda entry: entry.score, reverse=True)[:k]


def tokenize(text: str) -> list[str]:
    """Lowercase, strip punctuation, split on whitespace."""
    return [token for token in _TOKEN_SPLIT.split(text.lower()) if token]


class BM25Index(Generic[T]):
    """Okapi BM25 (lesson 37).

    Lexical retrieval that catches the exact identifiers, product codes and
    proper nouns that embeddings blur.
    """

    def __init__(self, k1: float = 1.5, b: float = 0.75) -> None:
        self.k1 = k1
        self.b = b
        self._docs: list[tuple[T, Counter[str], int]] = []
        self._df: Counter[str] = Counter()
        self._average_length = 0.0

    def add(self, item: T, text: str) -> None:
        tokens = tokenize(text)
        self._docs.append((item, Counter(tokens), len(tokens)))
        self._df.update(set(tokens))
        total = sum(length for _, _, length in self._docs)
        self._average_length = total / len(self._docs)

    def search(self, query: str, k: int = 5) -> list[Scored[T]]:
        terms = tokenize(query)
        scored: list[Scored[T]] = []
        for item, counts, length in self._docs:
            score = 0.0
            for term in terms:
                frequency = counts.get(term, 0)
                if not frequency:
                    continue
                df = self._df[term]
                idf = math.log(1 + (len(self._docs) - df + 0.5) / (df + 0.5))
                denominator = frequency + self.k1 * (
                    1 - self.b + self.b * length / self._average_length
                )
                score += idf * (frequency * (self.k1 + 1) / denominator)
            scored.append(Scored(item, score))
        return [entry for entry in top_k(scored, k) if entry.score > 0]

    def __len__(self) -> int:
        return len(self._docs)


def reciprocal_rank_fusion(
    rankings: list[list[T]],
    key_of,  # noqa: ANN001 - Callable[[T], str]
    k: int = 60,
) -> list[Scored[T]]:
    """Merge independent ranked lists without needing a shared score scale."""
    scores: dict[str, float] = {}
    items: dict[str, T] = {}
    for ranking in rankings:
        for index, item in enumerate(ranking):
            key = key_of(item)
            items[key] = item
            scores[key] = scores.get(key, 0.0) + 1 / (k + index + 1)
    return sorted(
        (Scored(items[key], score) for key, score in scores.items()),
        key=lambda entry: entry.score,
        reverse=True,
    )
