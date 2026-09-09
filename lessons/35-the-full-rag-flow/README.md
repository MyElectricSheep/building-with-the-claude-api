# 35 · The full RAG flow

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 35, _The full RAG flow_
>
> **2026 status: 🟢 Current**

## What the lesson teaches

The architecture, end to end:

```
INDEX TIME                      QUERY TIME
documents                       question
   ↓ chunk                         ↓ embed (input_type="query")
chunks                          query vector
   ↓ embed (input_type="document")  ↓ similarity search
vectors → vector index  ──────────► top-k chunks
                                    ↓ inject into the prompt
                                  Claude
```

## What the Academy does

Exactly this. The diagram is still the right mental model and nothing in it is
deprecated.

## What changed

Nothing structural. Four things belong on the diagram that were not on it in the
course, each of which slots into an existing arrow:

| Where             | Addition                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| chunk → embed     | **Contextual retrieval**: prepend a document-aware sentence to each chunk before embedding, or use a contextualised chunk model (`voyage-context-4`) |
| similarity search | **Hybrid**: run BM25 alongside the vector index and fuse (lessons 37–38)                                                                             |
| top-k → prompt    | **Reranking** (`rerank-2.5`): retrieve ~50, rerank, keep 5                                                                                           |
| inject → Claude   | **Citations**: pass chunks as `document` blocks with `citations: {enabled: true}` and get verifiable spans back instead of a promise (lesson 42)     |

And one thing to keep off the diagram: **the index is versioned by the embedding model**.
Change the model, or the dimension, or the chunking, and every stored vector is from a
different space. Rebuild it. Never mix vectors from two models in one index — nothing
will error; the rankings will simply be nonsense.

## The current implementation

The whole pipeline in one file, deliberately short enough to read in one pass, with each
stage labelled and timed:

1. load and chunk (section-aware)
2. embed the chunks in **one batched call**, `input_type="document"`
3. build an in-memory index that **records the model and dimension it was built with**
4. embed the question, `input_type="query"`
5. dot-product search, top-3
6. ask Claude with the retrieved chunks and a "say so if it is not here" instruction

It runs the question that no document answers, too. A RAG system that confidently
invents an answer for that one is worse than useless, and it is the case people forget
to test.

Lesson 36 takes the same pipeline and hardens it.

## Python vs TypeScript

Identical.

## Run it

```bash
npm run lesson -- 35
uv run lesson 35
```

## Environment variables

- `ANTHROPIC_API_KEY`
- `VOYAGE_API_KEY`

## References

- [Embeddings](https://platform.claude.com/docs/en/build-with-claude/embeddings)
- [Contextual retrieval](https://www.anthropic.com/news/contextual-retrieval)
- [Citations](https://platform.claude.com/docs/en/build-with-claude/citations)
