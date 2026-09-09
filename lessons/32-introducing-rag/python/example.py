"""Lesson 32 - Introducing RAG.

Stuff-everything vs retrieve-then-ask over the same corpus. The point is not
that RAG wins at this size - it is the token ratio, which is what does not
scale.

No VOYAGE_API_KEY needed: this uses lexical retrieval so the concept lands
before embeddings arrive in lesson 34.

    uv run lesson 32
"""

from __future__ import annotations

from course.blocks import text_of
from course.config import MODEL, create_client
from course.corpus import QUESTIONS, load_chunks, load_corpus
from course.retrieval import BM25Index

SYSTEM = (
    "Answer using only the supplied context. If the context does not contain "
    "the answer, say so plainly - do not guess."
)


def main() -> None:
    client = create_client()
    corpus = load_corpus()
    chunks = load_chunks()

    everything = "\n\n".join(f"# {doc.name}\n{doc.text}" for doc in corpus)

    index: BM25Index = BM25Index()
    for chunk in chunks:
        index.add(chunk, chunk.text)

    print(f"corpus: {len(corpus)} documents, {len(chunks)} chunks\n")

    stuffed_total = 0
    retrieved_total = 0

    for entry in QUESTIONS[:4]:
        question = entry["question"]
        print(f"Q: {question}")

        # 1. Stuff everything.
        stuffed = f"<context>\n{everything}\n</context>\n\n{question}"
        # count_tokens is free - use it before you spend anything.
        stuffed_tokens = client.messages.count_tokens(
            model=MODEL,
            system=SYSTEM,
            messages=[{"role": "user", "content": stuffed}],
        ).input_tokens
        stuffed_total += stuffed_tokens

        # 2. Retrieve, then ask.
        hits = index.search(question, k=3)
        context = "\n\n".join(f"# {hit.item.id}\n{hit.item.text}" for hit in hits)
        retrieved = f"<context>\n{context}\n</context>\n\n{question}"
        retrieved_tokens = client.messages.count_tokens(
            model=MODEL,
            system=SYSTEM,
            messages=[{"role": "user", "content": retrieved}],
        ).input_tokens
        retrieved_total += retrieved_tokens

        response = client.messages.create(
            model=MODEL,
            max_tokens=300,
            system=SYSTEM,
            messages=[{"role": "user", "content": retrieved}],
        )
        sources = ", ".join(hit.item.source for hit in hits)
        print(f"   retrieved from: {sources}")
        print(f"   {text_of(response).strip()}")
        print(f"   tokens: stuffed {stuffed_tokens} | retrieved {retrieved_tokens}\n")

    ratio = stuffed_total / retrieved_total if retrieved_total else 0
    print(f"total input tokens: stuffed {stuffed_total} | retrieved {retrieved_total}")
    print(f"ratio: {ratio:.1f}x\n")
    print(
        "At six documents, stuffing works fine - a 1M-token window swallows this\n"
        "corpus whole. The ratio is what changes at 6,000 documents. And even\n"
        "where it fits, irrelevant context measurably costs answer quality: RAG\n"
        "buys precision, not just tokens."
    )


if __name__ == "__main__":
    main()
