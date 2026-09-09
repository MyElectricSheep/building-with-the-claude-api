"""Lesson 38 - A multi-index RAG pipeline.

Semantic + lexical + RRF fusion + reranking, scored on the same questions so the
complementarity is visible rather than asserted.

    uv run lesson 38
"""

from __future__ import annotations

from course.chunking import Chunk
from course.config import EMBEDDING_MODEL
from course.corpus import QUESTIONS, load_chunks
from course.embeddings import embed, rerank
from course.retrieval import BM25Index, reciprocal_rank_fusion
from course.vectorstore import VectorIndex

CANDIDATES = 8  # retrieve this many cheaply, then rerank
FINAL = 3


def main() -> None:
    chunks = load_chunks()

    # Semantic index.
    doc_result = embed([chunk.text for chunk in chunks], "document")
    semantic = VectorIndex(EMBEDDING_MODEL)
    semantic.add(chunks, doc_result.embeddings)

    # Lexical index.
    lexical: BM25Index = BM25Index()
    for chunk in chunks:
        lexical.add(chunk, chunk.text)

    print(f"{len(chunks)} chunks | semantic {EMBEDDING_MODEL} | lexical BM25\n")
    header = f"{'question':<46}{'semantic':<14}{'lexical':<14}{'hybrid':<14}reranked"
    print(header)
    print("-" * len(header))

    tallies = {"semantic": 0, "lexical": 0, "hybrid": 0, "reranked": 0}
    scorable = [entry for entry in QUESTIONS if entry["expect"]]

    for entry in QUESTIONS:
        question = entry["question"]
        query_vector = embed([question], "query").embeddings[0]

        semantic_scored = semantic.search(
            query_vector, k=CANDIDATES, query_model=EMBEDDING_MODEL
        )
        semantic_hits = [hit.item for hit in semantic_scored]
        lexical_hits = [hit.item for hit in lexical.search(question, k=CANDIDATES)]

        # RRF uses RANKS, never scores: a BM25 score of 4.9 and a cosine of 0.71
        # are not on the same scale and never will be.
        fused = reciprocal_rank_fusion(
            [semantic_hits, lexical_hits], key_of=lambda chunk: chunk.id
        )
        hybrid_hits: list[Chunk] = [scored.item for scored in fused][:CANDIDATES]

        # Rerank the fused shortlist with a cross-encoder.
        reranked: list[Chunk] = []
        if hybrid_hits:
            hits = rerank(question, [chunk.text for chunk in hybrid_hits], top_k=FINAL)
            reranked = [hybrid_hits[hit.index] for hit in hits]

        results = {
            "semantic": semantic_hits[0].source if semantic_hits else "-",
            "lexical": lexical_hits[0].source if lexical_hits else "-",
            "hybrid": hybrid_hits[0].source if hybrid_hits else "-",
            "reranked": reranked[0].source if reranked else "-",
        }
        marks = {}
        for name, top in results.items():
            if entry["expect"]:
                ok = top == entry["expect"]
                tallies[name] += int(ok)
                marks[name] = f"{'+' if ok else '-'}{top.replace('.md', '')}"
            else:
                marks[name] = top.replace(".md", "")

        print(
            f"{question[:44]:<46}"
            f"{marks['semantic']:<14}{marks['lexical']:<14}"
            f"{marks['hybrid']:<14}{marks['reranked']}"
        )

    print()
    total = len(scorable)
    for name, score in tallies.items():
        print(f"  top-1 {name:<10} {score}/{total}")

    print(
        "\nRRF fuses ranks, not scores, which is why it needs no calibration\n"
        "between two retrievers on incompatible scales. Reranking goes after\n"
        "fusion: retrieve ~50 cheaply, rerank, keep 5. k=60 in RRF is a\n"
        "convention - lower it to sharpen the top ranks, raise it to flatten\n"
        "toward a simple vote. And measure any weighting on a held-out set."
    )


if __name__ == "__main__":
    main()
