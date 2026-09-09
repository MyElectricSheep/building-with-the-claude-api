import math

import pytest
from course.retrieval import (
    BM25Index,
    Scored,
    cosine_similarity,
    dot_product,
    reciprocal_rank_fusion,
    tokenize,
    top_k,
)


def test_dot_product_rejects_mismatched_dimensions():
    with pytest.raises(ValueError, match="Dimension mismatch"):
        dot_product([1.0, 2.0], [1.0])


def test_cosine_matches_dot_product_for_unit_vectors():
    a, b = [0.6, 0.8], [1.0, 0.0]
    assert math.isclose(cosine_similarity(a, b), dot_product(a, b))


def test_cosine_handles_zero_vector():
    assert cosine_similarity([0.0, 0.0], [1.0, 1.0]) == 0.0


def test_tokenize_lowercases_and_drops_punctuation():
    assert tokenize("Hello, WORLD! -- 42") == ["hello", "world", "42"]


def test_top_k_orders_by_score():
    scored = [Scored("a", 1.0), Scored("b", 3.0), Scored("c", 2.0)]
    assert [entry.item for entry in top_k(scored, 2)] == ["b", "c"]
    assert scored[0].item == "a"


def test_bm25_ranks_exact_identifier_first():
    index: BM25Index[str] = BM25Index()
    index.add("d1", "The invoice INV-88213 was paid in full last Tuesday.")
    index.add("d2", "Payments and billing statements are processed monthly.")
    index.add("d3", "Unrelated notes about the office coffee machine.")

    results = index.search("INV-88213", k=3)
    assert results[0].item == "d1"
    assert len(index) == 3


def test_bm25_returns_nothing_without_a_matching_term():
    index: BM25Index[str] = BM25Index()
    index.add("d1", "alpha beta")
    assert index.search("gamma") == []


def test_rrf_rewards_agreement():
    fused = reciprocal_rank_fusion([["a", "b", "c"], ["c", "a", "d"]], lambda x: x)
    assert fused[0].item == "a"
    assert len(fused) == 4
