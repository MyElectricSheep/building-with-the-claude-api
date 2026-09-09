"""Text chunking (lesson 33). Pure functions - no network, fully unit tested."""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Chunk:
    id: str
    text: str
    ordinal: int
    source: str


def chunk_by_characters(
    text: str, source: str, size: int = 800, overlap: int = 100
) -> list[Chunk]:
    """Split on a fixed character count - the naive baseline."""
    if size <= 0:
        raise ValueError("size must be positive")
    if not 0 <= overlap < size:
        raise ValueError("overlap must be >= 0 and < size")

    chunks: list[Chunk] = []
    stride = size - overlap
    for start in range(0, max(len(text), 1), stride):
        piece = text[start : start + size].strip()
        if piece:
            chunks.append(Chunk(f"{source}#{len(chunks)}", piece, len(chunks), source))
        if start + size >= len(text):
            break
    return chunks


def chunk_by_paragraph(text: str, source: str, target_size: int = 800) -> list[Chunk]:
    """Split on blank-line paragraph boundaries, then pack up to a target size.

    Respecting semantic boundaries is what the lesson actually argues for, and
    it remains current practice in 2026.
    """
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[Chunk] = []
    buffer = ""

    def flush() -> None:
        nonlocal buffer
        if buffer:
            chunks.append(Chunk(f"{source}#{len(chunks)}", buffer, len(chunks), source))
            buffer = ""

    for paragraph in paragraphs:
        if buffer and len(buffer) + len(paragraph) + 2 > target_size:
            flush()
        buffer = f"{buffer}\n\n{paragraph}" if buffer else paragraph
        if len(buffer) >= target_size:
            flush()
    flush()
    return chunks


def chunk_by_section(text: str, source: str) -> list[Chunk]:
    """Split on Markdown ATX headings, keeping each heading with its section."""
    sections: list[str] = []
    current: list[str] = []
    for line in text.split("\n"):
        if re.match(r"^#{1,6}\s", line) and current:
            sections.append("\n".join(current).strip())
            current = []
        current.append(line)
    if current:
        sections.append("\n".join(current).strip())

    return [
        Chunk(f"{source}#{ordinal}", section, ordinal, source)
        for ordinal, section in enumerate(s for s in sections if s)
    ]
