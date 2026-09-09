"""Lesson 36 - Implementing the RAG flow, hardened.

Fixes the inherited input_type and one-at-a-time embedding, then adds the three
things this is the right place for: contextual prefixes, citations, and a score
floor.

    uv run lesson 36
    uv run lesson 36 -- --rebuild
"""

from __future__ import annotations

import argparse
import json

from course.blocks import text_of
from course.chunking import Chunk
from course.config import EMBEDDING_MODEL, FAST_MODEL, MODEL, REPO_ROOT, create_client
from course.corpus import QUESTIONS, load_chunks, load_corpus
from course.embeddings import embed
from course.vectorstore import VectorIndex

CACHE_PATH = REPO_ROOT / "assets" / "cache" / "contextual.json"

# Below this dot-product score, refuse rather than answer. Retrieving three
# irrelevant chunks and asking anyway is how RAG systems hallucinate.
SCORE_FLOOR = 0.35

SYSTEM = (
    "Answer using only the supplied documents. If they do not contain the "
    "answer, say exactly: 'That is not covered in these documents.'"
)

CONTEXT_PROMPT = """<document>
{document}
</document>

Here is a chunk from that document:

<chunk>
{chunk}
</chunk>

Write ONE short sentence that situates this chunk within the whole document, so
it can be retrieved on its own. Name the document's subject and what this chunk
covers. No preamble."""


def build_contextual_prefixes(client, chunks: list[Chunk]) -> dict[str, str]:  # noqa: ANN001
    """One cheap generation per chunk, once, at index time."""
    documents = {doc.name: doc.text for doc in load_corpus()}
    prefixes: dict[str, str] = {}
    for chunk in chunks:
        response = client.messages.create(
            model=FAST_MODEL,
            max_tokens=120,
            messages=[
                {
                    "role": "user",
                    "content": CONTEXT_PROMPT.format(
                        document=documents[chunk.source], chunk=chunk.text
                    ),
                }
            ],
        )
        prefixes[chunk.id] = text_of(response).strip()
        print(f"  {chunk.id}: {prefixes[chunk.id][:70]}")
    return prefixes


def load_or_build(client, chunks: list[Chunk], rebuild: bool) -> dict[str, str]:  # noqa: ANN001
    if CACHE_PATH.exists() and not rebuild:
        cached = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        if all(chunk.id in cached for chunk in chunks):
            print(f"contextual prefixes: cached ({len(cached)})")
            return cached
    print("contextual prefixes: generating (cached afterwards)")
    prefixes = build_contextual_prefixes(client, chunks)
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(prefixes, indent=2) + "\n", encoding="utf-8")
    return prefixes


def build_index(chunks: list[Chunk], texts: list[str]) -> VectorIndex:
    # Batch: one request for the whole corpus. Voyage returns an `index` per
    # embedding and the wrapper sorts by it - the API does not promise order.
    result = embed(texts, "document")
    index = VectorIndex(EMBEDDING_MODEL)
    index.add(chunks, result.embeddings)
    return index


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rebuild", action="store_true")
    args = parser.parse_args()

    client = create_client()
    chunks = load_chunks()
    prefixes = load_or_build(client, chunks, args.rebuild)

    plain = build_index(chunks, [chunk.text for chunk in chunks])
    contextual = build_index(
        chunks, [f"{prefixes[chunk.id]}\n\n{chunk.text}" for chunk in chunks]
    )
    print(f"\n{len(plain)} chunks indexed two ways\n")

    scores = {"plain": 0, "contextual": 0}
    scorable = [entry for entry in QUESTIONS if entry["expect"]]

    for entry in QUESTIONS:
        question = entry["question"]
        query_vector = embed([question], "query").embeddings[0]
        print(f"Q: {question}")

        for label, index in (("plain", plain), ("contextual", contextual)):
            hits = index.search(query_vector, k=3, query_model=EMBEDDING_MODEL)
            top = hits[0]
            hit_mark = "-"
            if entry["expect"]:
                correct = top.item.source == entry["expect"]
                scores[label] += int(correct)
                hit_mark = "PASS" if correct else "MISS"
            print(
                f"   {label:<11} {top.item.source:<16} {top.score:.3f}  [{hit_mark}]"
            )

        # The score floor: refuse before spending a request.
        hits = contextual.search(query_vector, k=3, query_model=EMBEDDING_MODEL)
        if hits[0].score < SCORE_FLOOR:
            print(
                f"   -> best score {hits[0].score:.3f} < floor {SCORE_FLOOR}; "
                "refused without calling the model\n"
            )
            continue

        # Citations: pass each chunk as a document block. Verifiable spans, not
        # a promise. NOTE: citations cannot be combined with
        # output_config.format - a request with both returns a 400.
        content = [
            {
                "type": "document",
                "source": {
                    "type": "text",
                    "media_type": "text/plain",
                    "data": hit.item.text,
                },
                "title": hit.item.id,
                "citations": {"enabled": True},
            }
            for hit in hits
        ]
        content.append({"type": "text", "text": question})

        response = client.messages.create(
            model=MODEL,
            max_tokens=500,
            system=SYSTEM,
            messages=[{"role": "user", "content": content}],
        )
        print(f"   {text_of(response).strip()}")

        cited: set[str] = set()
        for block in response.content:
            if block.type != "text":
                continue
            for citation in getattr(block, "citations", None) or []:
                title = getattr(citation, "document_title", None)
                if title:
                    cited.add(title)
        print(f"   cited: {', '.join(sorted(cited)) if cited else '(none)'}\n")

    total = len(scorable)
    print(f"top-1 accuracy   plain {scores['plain']}/{total}   ", end="")
    print(f"contextual {scores['contextual']}/{total}")
    print(
        "\nContextual prefixes cost one cheap generation per chunk, once. On a\n"
        "six-document corpus the gap is small; the technique earns its keep when\n"
        "chunks are ambiguous out of context - which is most real corpora."
    )


if __name__ == "__main__":
    main()
