import pytest
from course.chunking import chunk_by_characters, chunk_by_paragraph, chunk_by_section


def test_chunk_by_characters_respects_size_and_overlap():
    # stride = size - overlap = 80, so windows start at 0, 80, 160 and the
    # third window already reaches the end of the text.
    chunks = chunk_by_characters("a" * 250, "doc", size=100, overlap=20)
    assert len(chunks) == 3
    assert len(chunks[0].text) == 100
    assert chunks[0].id == "doc#0"
    assert len(chunks[-1].text) == 90


def test_chunk_by_characters_rejects_impossible_overlap():
    with pytest.raises(ValueError, match="overlap"):
        chunk_by_characters("abc", "doc", size=10, overlap=10)
    with pytest.raises(ValueError, match="positive"):
        chunk_by_characters("abc", "doc", size=0)


def test_chunk_by_paragraph_does_not_split_paragraphs():
    text = "First para.\n\nSecond para.\n\nThird para."
    chunks = chunk_by_paragraph(text, "doc", target_size=30)
    assert len(chunks) >= 2
    assert "\n\n".join(chunk.text for chunk in chunks) == text


def test_chunk_by_section_keeps_heading_with_body():
    chunks = chunk_by_section("# One\nbody one\n\n## Two\nbody two", "doc")
    assert len(chunks) == 2
    assert chunks[0].text.startswith("# One")
    assert chunks[1].text.startswith("## Two")
