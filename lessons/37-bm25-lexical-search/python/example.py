"""Lesson 37 - BM25 lexical search.

Runs entirely locally. BM25 finds the exact token that embeddings blur - and
misses the paraphrase that embeddings catch. That complementarity is lesson 38's
whole argument.

    uv run lesson 37
"""

from __future__ import annotations

import math
from collections import Counter

from course.corpus import QUESTIONS, load_chunks
from course.retrieval import BM25Index, tokenize


def main() -> None:
    chunks = load_chunks()
    index: BM25Index = BM25Index()
    for chunk in chunks:
        index.add(chunk, chunk.text)

    print(f"{len(chunks)} chunks indexed\n")

    correct = 0
    scorable = [entry for entry in QUESTIONS if entry["expect"]]
    for entry in QUESTIONS:
        hits = index.search(entry["question"], k=3)
        top = hits[0].item.source if hits else "(nothing matched)"
        if entry["expect"]:
            mark = "PASS" if top == entry["expect"] else "MISS"
            correct += int(top == entry["expect"])
        else:
            # No document answers this. BM25 will still return something -
            # a lexical score is not a relevance guarantee.
            mark = "n/a"
        print(f"[{mark:<4}] {entry['question']}")
        for hit in hits:
            print(f"         {hit.score:6.3f}  {hit.item.id}")
        print()

    print(f"top-1 accuracy: {correct}/{len(scorable)}\n")

    # Why did that rank first? BM25 is not magic - it is IDF.
    query = "What is the ticket type for production access?"
    print(f'term weights for: "{query}"')
    document_frequency: Counter[str] = Counter()
    for chunk in chunks:
        document_frequency.update(set(tokenize(chunk.text)))
    for term in tokenize(query):
        df = document_frequency.get(term, 0)
        idf = math.log(1 + (len(chunks) - df + 0.5) / (df + 0.5))
        print(f"  {term:<12} in {df:>2}/{len(chunks)} chunks   idf {idf:.3f}")
    print("  Rare terms carry the ranking. Common ones barely move it.\n")

    # The pair that motivates hybrid retrieval. Both ask for the same fact -
    # "how do I get production access?" - but only one of them shares a rare
    # token with the document that answers it.
    paraphrase = "what paperwork lets me reach the live environment?"
    print("same fact, two ways of asking")
    outcomes: dict[str, str] = {}
    for label, question in (("exact term", "ACCESS-PROD"), ("paraphrase", paraphrase)):
        hits = index.search(question, k=1)
        found = hits[0].item.source if hits else "(nothing matched)"
        outcomes[label] = found
        mark = "PASS" if found == "onboarding.md" else "MISS"
        print(f"  [{mark}] {label:<11} {question!r} -> {found}")

    print(
        f"\nBM25 found the identifier in {outcomes['exact term']} and the "
        f"paraphrase in {outcomes['paraphrase']}.\n"
        "The paraphrase shares no rare token with the document that answers it,\n"
        "so IDF has nothing to work with and it ranks on whatever common words\n"
        "happen to overlap. Embeddings fail the opposite way. Neither is the\n"
        "better retriever; lesson 38 runs both."
    )


if __name__ == "__main__":
    main()
