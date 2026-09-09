"""Lesson 34 - Text embeddings, and the input_type trap.

Three embeddings of the same corpus, differing only in input_type, scored on the
same questions. The wrong pairing produces no error at all - it just retrieves
worse, invisibly.

    uv run lesson 34
"""

from __future__ import annotations

from course.config import EMBEDDING_MODEL
from course.corpus import QUESTIONS, load_chunks
from course.embeddings import embed
from course.retrieval import cosine_similarity, dot_product

PAIRINGS = [
    ("correct        (doc/query)", "document", "query"),
    ("Academy default (query/query)", "query", "query"),
    ("inverted       (query/doc)", "query", "document"),
]


def main() -> None:
    chunks = load_chunks()
    questions = [entry for entry in QUESTIONS if entry["expect"]]
    texts = [chunk.text for chunk in chunks]

    print(
        f"model {EMBEDDING_MODEL} | {len(chunks)} chunks | "
        f"{len(questions)} questions"
    )
    print("(the question with no answer in the corpus is excluded from scoring)\n")

    for label, doc_type, query_type in PAIRINGS:
        # Batch. One request for the whole corpus, not one per chunk.
        doc_result = embed(texts, doc_type)
        query_result = embed([q["question"] for q in questions], query_type)

        correct = 0
        for entry, query_vector in zip(questions, query_result.embeddings, strict=True):
            # Voyage vectors are L2-normalised, so the dot product ranks
            # identically to cosine similarity and is cheaper.
            scores = [
                dot_product(vector, query_vector)
                for vector in doc_result.embeddings
            ]
            best = max(range(len(scores)), key=lambda i: scores[i])
            if chunks[best].source == entry["expect"]:
                correct += 1

        tokens = doc_result.total_tokens + query_result.total_tokens
        print(
            f"{label:<30} top-1 {correct}/{len(questions)}   "
            f"({tokens} embedding tokens)"
        )

    # Dot product vs cosine on normalised vectors: same ranking.
    sample = embed(texts[:3], "document").embeddings
    query_vector = embed([questions[0]["question"]], "query").embeddings[0]
    dots = [dot_product(vector, query_vector) for vector in sample]
    cosines = [cosine_similarity(vector, query_vector) for vector in sample]
    same_order = sorted(range(3), key=lambda i: -dots[i]) == sorted(
        range(3), key=lambda i: -cosines[i]
    )
    print(f"\ndot and cosine agree on ranking: {same_order}")
    print(f"  dot    {[round(v, 4) for v in dots]}")
    print(f"  cosine {[round(v, 4) for v in cosines]}")

    print(
        "\nThe wrong input_type pairing raises nothing. It is not a bug you find\n"
        "by running the code - it is one you find by measuring retrieval."
    )


if __name__ == "__main__":
    main()
