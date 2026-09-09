# 34 · Text embeddings

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 34, _Text embeddings_
>
> **2026 status: 🟠 Right idea, wrong model, and one subtle trap**

## What the lesson teaches

An embedding is a vector; similar meanings land near each other; similarity search is
a dot product. And: **Anthropic does not ship an embedding model** — the documentation
points at Voyage AI.

Both still true.

## What the Academy does

```python
vo.embed(chunks, model="voyage-3-large", input_type="query")
```

## What changed

### 1. The model generation

`voyage-3-large` is previous-generation. The current lineup:

| Model            | Use                                           |
| ---------------- | --------------------------------------------- |
| `voyage-4-large` | best retrieval quality                        |
| `voyage-4`       | balanced — the sensible default               |
| `voyage-4-lite`  | lowest latency and cost — this repo's default |
| `voyage-4-nano`  | open-weight (Apache 2.0), on Hugging Face     |

All four take 32,000-token inputs and default to 1024 dimensions (256/512/2048 also
available, via Matryoshka truncation). Domain models still exist: `voyage-code-3`,
`voyage-finance-2`, `voyage-law-2`. For chunk-level context without hand-written
prefixes, `voyage-context-4`.

### 2. The trap: `input_type` is not one value

This is the correction that actually changes your recall.

```python
# chunks you want to be FOUND
vo.embed(chunks, model="voyage-4", input_type="document")

# what the user is LOOKING WITH
vo.embed([query], model="voyage-4", input_type="query")
```

Voyage prepends a different instruction internally for each — _"Represent the document
for retrieval:"_ versus _"Represent the query for retrieving supporting documents:"_ —
so the two sides are embedded into complementary positions. Voyage's documentation says
explicitly: for retrieval, do not omit `input_type` and do not set it to `None`.

The Academy's helper defaults everything to one value. It does not error. It just
retrieves slightly worse, invisibly, forever.

### 3. Dot product is enough

Voyage embeddings are L2-normalised, so cosine similarity and dot product give
**identical rankings** and the dot product is cheaper. Keep `cosineSimilarity` around
for vectors from providers that do not normalise.

### 4. Batch

Send the whole list in one call. The Academy embeds chunks one at a time; that is more
requests for the same tokens.

## The current implementation

Embeds the corpus **three ways** and scores the same seven questions against each:

| Run                 | documents as | queries as |
| ------------------- | ------------ | ---------- |
| correct             | `document`   | `query`    |
| the Academy default | `query`      | `query`    |
| inverted            | `query`      | `document` |

It reports top-1 accuracy for each, plus a dot-vs-cosine agreement check. Expect the
correct pairing to win. The size of the gap on a corpus this small is not the finding —
the finding is that the wrong pairing produces **no error at all**.

## Python vs TypeScript

Python uses the official `voyageai` package. Voyage ships no TypeScript SDK, so
`shared/typescript/embeddings.ts` is a small typed wrapper over the REST endpoint —
which is the right shape for a TS project, not a workaround. Both sort results by
`index`, since the API does not promise ordering.

## Run it

```bash
npm run lesson -- 34
uv run lesson 34
```

## Environment variables

- `VOYAGE_API_KEY` — get one at <https://dashboard.voyageai.com/>
- (`ANTHROPIC_API_KEY` is **not** needed: this lesson never calls Claude)

## References

- [Embeddings](https://platform.claude.com/docs/en/build-with-claude/embeddings)
- [Voyage embeddings API](https://docs.voyageai.com/reference/embeddings-api)
- [Contextual retrieval](https://www.anthropic.com/news/contextual-retrieval)
