# 33 · Text chunking strategies

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 33, _Text chunking strategies_
>
> **2026 status: 🟢 Current**

## What the lesson teaches

Documents get split before they get embedded. How you split determines what can be
retrieved: a chunk that cuts a definition in half retrieves half a definition.

Split on meaningful boundaries — paragraphs, sections — not on a character count.

## What the Academy does

Contrasts fixed-size chunking with boundary-aware chunking and argues for the latter.
Still correct, and still the default advice.

## What changed

Nothing was invalidated. Three things were added to the toolbox above this lesson:

1. **Contextual retrieval.** Prepend a short, document-aware description to each chunk
   before embedding it ("This section is from the deployments runbook and covers
   rollbacks"). Anthropic's own research on contextual retrieval reports a large
   reduction in failed retrievals from this alone. It is cheap: generate the prefix once,
   at index time.
2. **Contextualised chunk embedding models.** `voyage-context-4` produces chunk-level
   vectors that already carry document context, without you writing the prefix.
3. **Reranking.** A cross-encoder (`rerank-2.5`) re-scores the top ~50 candidates.
   Reranking is often a better use of effort than agonising over chunk size, because it
   tolerates imperfect chunks.

The order of return on effort, roughly: get boundaries right → add hybrid retrieval
(lesson 38) → add reranking → then tune chunk size.

## The current implementation

`example.*` runs **entirely locally — no API key, no network, no cost.** It chunks the
same document three ways and prints, for each strategy:

- chunk count and size distribution
- how many chunks **split a heading away from its body**
- how many chunks are too small to be independently meaningful
- a worked retrieval-failure case: whether one specific sentence — the one that answers
  "can I roll back a migration?" — survives intact, and whether it keeps its heading

That last check produces all three outcomes at once: at 120 characters the sentence is
**split across chunks and cannot be retrieved at all**; at 300 it survives but is
**severed from its heading**, so the embedding loses the context that says which runbook
it belongs to; only the boundary-aware strategies keep both. That is the argument the
lesson makes, made measurable.

## Python vs TypeScript

Mirrored, with the same unit tests either side
(`shared/typescript/chunking.test.ts`, `tests/python/test_chunking.py`).

## Run it

```bash
npm run lesson -- 33
uv run lesson 33
```

No `ANTHROPIC_API_KEY` needed.

## Environment variables

None.

## References

- [Contextual retrieval](https://www.anthropic.com/news/contextual-retrieval)
- [Embeddings — contextualised chunk models](https://platform.claude.com/docs/en/build-with-claude/embeddings)
