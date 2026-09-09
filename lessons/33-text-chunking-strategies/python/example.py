"""Lesson 33 - Text chunking strategies.

Runs entirely locally. Three strategies over the same document, with the
retrieval failure that fixed-size chunking causes made concrete.

    uv run lesson 33
"""

from __future__ import annotations

import re

from course.chunking import (
    Chunk,
    chunk_by_characters,
    chunk_by_paragraph,
    chunk_by_section,
)
from course.corpus import load_corpus

HEADING = re.compile(r"^#{1,6}\s", re.MULTILINE)


def orphaned_headings(chunks: list[Chunk]) -> int:
    """Chunks that are a heading with (almost) no body, or a body with no heading."""
    count = 0
    for chunk in chunks:
        lines = [line for line in chunk.text.split("\n") if line.strip()]
        if not lines:
            continue
        starts_with_heading = bool(HEADING.match(lines[0]))
        if starts_with_heading and len(lines) == 1:
            count += 1
    return count


def report(label: str, chunks: list[Chunk]) -> None:
    sizes = [len(chunk.text) for chunk in chunks]
    tiny = sum(1 for size in sizes if size < 120)
    print(f"{label:<22} {len(chunks):>3} chunks  ", end="")
    print(f"min {min(sizes):>4}  max {max(sizes):>4}  ", end="")
    print(f"mean {sum(sizes) // len(sizes):>4}  ", end="")
    print(f"tiny {tiny}  orphaned headings {orphaned_headings(chunks)}")


def main() -> None:
    document = next(d for d in load_corpus() if d.name == "deployments.md")
    print(f"document: {document.name} ({len(document.text)} chars)\n")

    strategies = {
        "fixed 120/0": chunk_by_characters(document.text, document.name, 120, 0),
        "fixed 300/0": chunk_by_characters(document.text, document.name, 300, 0),
        "fixed 300/60": chunk_by_characters(document.text, document.name, 300, 60),
        "paragraph": chunk_by_paragraph(document.text, document.name, 500),
        "section": chunk_by_section(document.text, document.name),
    }
    for label, chunks in strategies.items():
        report(label, chunks)

    # The argument, made concrete. This sentence answers "can I roll back a
    # migration?" and fixed-size chunking cuts it.
    needle = (
        "They are not reverted by a rollback, which is why every migration "
        "must be backwards compatible"
    )
    print(f"\nlooking for the sentence containing {needle!r}\n")

    # Normalise whitespace: the source wraps the sentence across two lines, and
    # a chunk boundary is about the words, not the newlines.
    def flat(text: str) -> str:
        return " ".join(text.split())

    for label, chunks in strategies.items():
        hits = [chunk for chunk in chunks if flat(needle) in flat(chunk.text)]
        if not hits:
            print(
                f"  {label:<22} SPLIT ACROSS CHUNKS - "
                "the sentence is not retrievable"
            )
            continue
        chunk = hits[0]
        has_context = "#" in chunk.text
        note = "with its heading" if has_context else "without its heading"
        print(f"  {label:<22} intact in one chunk, {note}")

    print(
        "\nA chunk that cuts a definition in half retrieves half a definition.\n"
        "Above this: prepend document-aware context to each chunk before\n"
        "embedding (contextual retrieval), or use a contextualised chunk model\n"
        "such as voyage-context-4. Then add reranking. Tune chunk size last."
    )


if __name__ == "__main__":
    main()
