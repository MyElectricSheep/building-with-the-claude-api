import pytest
from course.chunking import Chunk
from course.vectorstore import VectorIndex


def chunk(id_: str) -> Chunk:
    return Chunk(id=id_, text=id_, ordinal=0, source="a.md")


def test_search_ranks_by_dot_product():
    index = VectorIndex("voyage-4-lite")
    index.add(
        [chunk("a"), chunk("b"), chunk("c")],
        [[1.0, 0.0], [0.0, 1.0], [0.7, 0.7]],
    )
    hits = index.search([1.0, 0.0], k=2)
    assert hits[0].item.id == "a"
    assert hits[1].item.id == "c"
    assert len(index) == 3


def test_mismatched_batch_is_rejected():
    index = VectorIndex("voyage-4-lite")
    with pytest.raises(ValueError, match="Mismatched batch"):
        index.add([chunk("a")], [[1.0], [2.0]])


def test_wrong_dimension_on_add_is_rejected():
    index = VectorIndex("voyage-4-lite")
    index.add([chunk("a")], [[1.0, 0.0]])
    with pytest.raises(ValueError, match="Dimension mismatch"):
        index.add([chunk("b")], [[1.0, 0.0, 0.0]])


def test_query_from_a_different_model_is_rejected():
    index = VectorIndex("voyage-4-lite")
    index.add([chunk("a")], [[1.0, 0.0]])
    with pytest.raises(ValueError, match="Rebuild the index"):
        index.search([1.0, 0.0], k=1, query_model="voyage-4-large")
    assert index.search([1.0, 0.0], k=1, query_model="voyage-4-lite")[0].item.id == "a"


def test_query_of_wrong_dimension_is_rejected():
    index = VectorIndex("voyage-4-lite")
    index.add([chunk("a")], [[1.0, 0.0]])
    with pytest.raises(ValueError, match="Dimension mismatch"):
        index.search([1.0, 0.0, 0.0], k=1)
