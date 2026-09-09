"""Loading and chunking the small documentation corpus used by lessons 32-38."""

from __future__ import annotations

from dataclasses import dataclass

from course.chunking import Chunk, chunk_by_section
from course.config import REPO_ROOT

CORPUS_DIR = REPO_ROOT / "assets" / "corpus"


@dataclass(frozen=True)
class Document:
    name: str
    text: str


def load_corpus() -> list[Document]:
    return [
        Document(path.name, path.read_text(encoding="utf-8"))
        for path in sorted(CORPUS_DIR.glob("*.md"))
    ]


def load_chunks() -> list[Chunk]:
    """Section-aware chunks across the whole corpus."""
    return [
        chunk
        for document in load_corpus()
        for chunk in chunk_by_section(document.text, document.name)
    ]


#: Questions used to compare retrieval strategies across lessons 34-38.
#:
#: ``expect`` is the file that actually answers the question. Deliberately
#: mixed: some are paraphrases (semantic search wins), some hinge on an exact
#: term (lexical search wins), and one is answered by no document at all.
QUESTIONS: list[dict[str, str | None]] = [
    {"question": "How long before I can touch production?", "expect": "onboarding.md"},
    {
        "question": "What is the ticket type for production access?",
        "expect": "onboarding.md",
    },
    {
        "question": "Can I put a database migration through a rollback?",
        "expect": "deployments.md",
    },
    {"question": "What does SEV2 mean?", "expect": "incidents.md"},
    {
        "question": "How much can I spend on dinner abroad without asking?",
        "expect": "expenses.md",
    },
    {"question": "When does the on-call handover happen?", "expect": "on-call.md"},
    {"question": "What is the company's parental leave policy?", "expect": None},
]
