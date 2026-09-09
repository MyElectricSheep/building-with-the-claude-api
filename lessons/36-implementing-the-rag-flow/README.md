# 36 · Implementing the RAG flow

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 36, _Implementing the RAG flow_
>
> **2026 status: 🟡 Good implementation, two inherited problems**

## What the lesson teaches

Turning lesson 35's diagram into code.

## What the Academy does

Implements it — carrying two habits from earlier lessons.

## What changed

### 1. Fix the `input_type` (inherited from lesson 34)

Chunks are `"document"`, the query is `"query"`. The Academy helper's default sends
everything as one type. It never errors; it just retrieves worse.

### 2. Batch the embedding calls

The Academy embeds chunks one at a time. Send the list. Same tokens, one request instead
of _n_, and Voyage returns results with an `index` field — **sort by it**, the API does
not promise ordering.

### 3. Then the things this lesson is the right place to add

|                          | Why                                                                                                                                                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Contextual retrieval** | Prepend a one-line, document-aware description to each chunk before embedding. Anthropic's own research shows a large drop in failed retrievals from this alone. It costs one cheap generation per chunk, once, at index time                                                                          |
| **Citations**            | Pass retrieved chunks as `document` content blocks with `citations: {enabled: true}` and Claude returns spans that point at the source text. That turns "trust me" into something you can check. Note: **citations and `output_config.format` cannot be combined** — a request with both returns a 400 |
| **A score floor**        | If the best hit scores below a threshold, do not ask the model at all. Retrieving three irrelevant chunks and asking anyway is how RAG systems hallucinate confidently                                                                                                                                 |

## The current implementation

The hardened pipeline. Compared with lesson 35 it adds:

- **contextual prefixes**, generated once with the cheap model and cached to
  `assets/cache/contextual.json` so re-runs cost nothing;
- **citations**, so answers carry verifiable spans;
- a **score floor**, so an off-corpus question is refused before it reaches the model;
- **both retrieval variants scored side by side** — plain chunks vs contextualised — so
  the claim is measured rather than asserted.

## Python vs TypeScript

Identical. Both write and read the same cache file.

## Run it

```bash
npm run lesson -- 36
uv run lesson 36

# regenerate the contextual prefixes
npm run lesson -- 36 -- --rebuild
uv run lesson 36 -- --rebuild
```

First run generates one short completion per chunk on the cheap model, then caches
them. Subsequent runs only embed and ask.

## Environment variables

- `ANTHROPIC_API_KEY`
- `VOYAGE_API_KEY`

## References

- [Contextual retrieval](https://www.anthropic.com/news/contextual-retrieval)
- [Citations](https://platform.claude.com/docs/en/build-with-claude/citations)
- [Embeddings](https://platform.claude.com/docs/en/build-with-claude/embeddings)
