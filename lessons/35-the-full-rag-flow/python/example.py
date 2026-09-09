"""Lesson 35 - The full RAG flow.

The whole pipeline in one readable pass, each stage labelled and timed - and it
runs the question no document answers, because that is the case people forget to
test.

    uv run lesson 35
"""

from __future__ import annotations

import time

from course.blocks import text_of
from course.config import EMBEDDING_MODEL, MODEL, create_client
from course.corpus import QUESTIONS, load_chunks
from course.embeddings import embed
from course.vectorstore import VectorIndex

SYSTEM = (
    "Answer using only the supplied context. Quote the section heading you "
    "used. If the context does not contain the answer, say exactly: "
    "'That is not covered in these documents.'"
)


def main() -> None:
    client = create_client()

    # 1. Load and chunk (section-aware, lesson 33).
    started = time.monotonic()
    chunks = load_chunks()
    print(f"1. chunk    {len(chunks)} chunks from the corpus")

    # 2. Embed the chunks. ONE batched call, input_type="document".
    doc_result = embed([chunk.text for chunk in chunks], "document")
    print(
        f"2. embed    {len(doc_result.embeddings)} vectors, "
        f"{len(doc_result.embeddings[0])} dims, "
        f"{doc_result.total_tokens} tokens, one request"
    )

    # 3. Index. It records the model it was built with; see vectorstore.py.
    index = VectorIndex(EMBEDDING_MODEL)
    index.add(chunks, doc_result.embeddings)
    print(f"3. index    {len(index)} vectors, model {index.model}")
    print(f"   indexing took {(time.monotonic() - started) * 1000:.0f} ms\n")

    for entry in QUESTIONS:
        question = entry["question"]
        print(f"Q: {question}")

        # 4. Embed the question. input_type="query" - the lesson-34 trap.
        query_vector = embed([question], "query").embeddings[0]

        # 5. Search.
        hits = index.search(query_vector, k=3, query_model=EMBEDDING_MODEL)
        sources = ", ".join(f"{hit.item.source} ({hit.score:.3f})" for hit in hits)
        print(f"   retrieved: {sources}")

        # 6. Ask.
        context = "\n\n".join(f"# {hit.item.id}\n{hit.item.text}" for hit in hits)
        response = client.messages.create(
            model=MODEL,
            max_tokens=400,
            system=SYSTEM,
            messages=[
                {
                    "role": "user",
                    "content": f"<context>\n{context}\n</context>\n\n{question}",
                }
            ],
        )
        answer = text_of(response).strip()
        print(f"   {answer}")

        if entry["expect"] is None:
            declined = "not covered" in answer.lower()
            mark = "PASS" if declined else "FAIL"
            print(f"   [{mark}] no document answers this; the system must say so")
        else:
            top = hits[0].item.source
            mark = "PASS" if top == entry["expect"] else "MISS"
            print(f"   [{mark}] expected {entry['expect']}, top hit {top}")
        print()

    print(
        "The index is versioned by the embedding model. Change the model, the\n"
        "dimension or the chunking and every stored vector is from a different\n"
        "space - rebuild it. Nothing errors if you do not; the rankings just\n"
        "become nonsense."
    )


if __name__ == "__main__":
    main()
