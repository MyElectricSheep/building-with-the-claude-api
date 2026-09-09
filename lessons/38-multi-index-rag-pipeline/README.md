# 38 · A multi-index RAG pipeline

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 38, _A Multi-Index RAG pipeline_
>
> **2026 status: 🟢 Current**

## What the lesson teaches

Run a semantic index and a lexical index over the same corpus, then **fuse** the two
rankings. Reciprocal Rank Fusion is the standard way:

```
score(d) = Σ  1 / (k + rank_i(d))        k = 60 by convention
```

RRF uses only **ranks**, never scores. That is the point: a BM25 score of 4.9 and a
cosine similarity of 0.71 are not on the same scale and never will be. Ranks are
comparable; scores are not.

## What the Academy does

Exactly this, and it remains completely legitimate.

## What changed

Nothing was invalidated. One stage belongs after fusion:

```
                ┌── vector retrieval ──┐
query ──────────┤                      ├── RRF ── rerank ── Claude
                └── BM25 retrieval ────┘
```

**Reranking** (`rerank-2.5`, `rerank-2.5-lite`) is a cross-encoder: it reads the query
and each candidate _together_ rather than comparing two independently-computed vectors,
so it is far more accurate and far too slow to run over the whole corpus. The standard
shape is retrieve ~50 cheaply, rerank, keep 5.

Two smaller notes:

- `k = 60` is a convention, not a law. Lowering it sharpens the influence of the top few
  ranks; raising it flattens the fusion toward a simple vote.
- RRF weights every retriever equally. If one retriever is consistently better on your
  traffic, weight it — but measure first, on a held-out set (lesson 15's discipline
  applies to retrieval too).

## The current implementation

Three retrievers over the same chunks, scored on the same questions:

|          |                                |
| -------- | ------------------------------ |
| semantic | Voyage embeddings, dot product |
| lexical  | BM25                           |
| hybrid   | RRF over both rankings         |

Plus **reranking**, run over the fused candidates with Voyage's `rerank-2.5-lite`, so
the last stage of the diagram is real code rather than a footnote.

The per-question table shows which retriever found which document, so you can see the
complementarity directly: the identifier questions are lexical wins, the paraphrase
questions are semantic wins, and hybrid should take both.

## Python vs TypeScript

Python uses `voyageai`'s `rerank()`. TypeScript calls the rerank REST endpoint through
the same small wrapper as embeddings.

## Run it

```bash
npm run lesson -- 38
uv run lesson 38
```

## Environment variables

- `VOYAGE_API_KEY`
- (`ANTHROPIC_API_KEY` is **not** needed: this lesson is retrieval only)

## References

- [Contextual retrieval](https://www.anthropic.com/news/contextual-retrieval)
- [Embeddings — rerankers](https://platform.claude.com/docs/en/build-with-claude/embeddings)
- [Voyage reranker API](https://docs.voyageai.com/reference/reranker-api)
