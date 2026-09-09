# Model choices

## What this repository defaults to

| Constant            | Default            | Where it is used           |
| ------------------- | ------------------ | -------------------------- |
| `CLAUDE_MODEL`      | `claude-sonnet-5`  | Most lessons               |
| `CLAUDE_FAST_MODEL` | `claude-haiku-4-5` | Bulk and mechanical work   |
| `VOYAGE_MODEL`      | `voyage-4-lite`    | Embeddings (lessons 34–38) |

All three are read in exactly one place per language —
`shared/typescript/config.ts` and `shared/python/course/config.py` — and
`scripts/check-repo.mjs` fails the build if any other file hardcodes a model id.
(`legacy.*` files are exempt: pinning an old model is the lesson.)

## Why these, and not `claude-opus-5`

Anthropic's own guidance for new code is to reach for the most capable model and only
step down when you have **measured** that a cheaper one is sufficient. That is the right
default for a product.

This is not a product. It is a course you will run repeatedly, often re-running the same
lesson while you change one line, and the goal is to learn an API rather than to
maximise answer quality. So:

- **`claude-sonnet-5`** is the current-generation successor to the course's
  `claude-sonnet-4-5`, which makes it the honest modernization target. It is capable
  enough that no lesson in this repository misbehaves on it, and at $2/$10 per MTok it is
  cheap enough to run the whole course several times without thinking about it.
- **`claude-haiku-4-5`** is used where the lesson teaches a _mechanism_ and the answer
  quality is beside the point: generating eval datasets, classification, routing, the
  specialists in the parallelization lesson, the writer in the evaluator-optimizer loop.
  Using a cheap model there is itself a lesson — it is what you would do in production.

Both are overridable, and the whole course runs on either:

```bash
CLAUDE_MODEL=claude-opus-5 npm run lesson -- 39
CLAUDE_MODEL=claude-opus-5 uv run lesson 39
```

## The current lineup

| Model             | ID                  | Context | Input $/MTok | Output $/MTok |
| ----------------- | ------------------- | ------- | ------------ | ------------- |
| Claude Fable 5.1  | `claude-fable-5-1`  | 1M      | 10.00        | 50.00         |
| Claude Fable 5    | `claude-fable-5`    | 1M      | 10.00        | 50.00         |
| Claude Opus 5     | `claude-opus-5`     | 1M      | 5.00         | 25.00         |
| Claude Opus 4.8   | `claude-opus-4-8`   | 1M      | 5.00         | 25.00         |
| Claude Opus 4.7   | `claude-opus-4-7`   | 1M      | 5.00         | 25.00         |
| Claude Opus 4.6   | `claude-opus-4-6`   | 1M      | 5.00         | 25.00         |
| Claude Sonnet 5   | `claude-sonnet-5`   | 1M      | 2.00         | 10.00         |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | 1M      | 3.00         | 15.00         |
| Claude Haiku 4.5  | `claude-haiku-4-5`  | 200K    | 1.00         | 5.00          |

Model IDs are complete as written — **never append a date suffix**. Prices are
Anthropic first-party API rates; Bedrock and Google Cloud are partner-operated with
separate pricing.

Lesson 1 lists what your key can actually reach, live, and costs nothing to run.

## What changing the model changes

Not every lesson behaves the same on every model, and that is itself worth knowing:

| Lesson                                          | On a pre-4.7 model                        | On the default                  |
| ----------------------------------------------- | ----------------------------------------- | ------------------------------- |
| [06](../lessons/06-temperature/) `legacy`       | `temperature` is accepted                 | Python SDK `TypeError`; API 400 |
| [08](../lessons/08-structured-data/) `legacy`   | prefill works                             | 400                             |
| [39](../lessons/39-extended-thinking/) `legacy` | `budget_tokens` works                     | 400                             |
| [39](../lessons/39-extended-thinking/)          | `display` defaults to `summarized` on 4.6 | defaults to `omitted`           |
| [24](../lessons/24-handling-message-blocks/)    | fewer `thinking` blocks                   | thinking on by default          |

Each of those legacy files detects which case it is in and says so, rather than assuming.

## The Voyage side

Anthropic ships no embedding model; the documentation points at Voyage AI. Current
generation is Voyage 4:

| Model            | Use                                           |
| ---------------- | --------------------------------------------- |
| `voyage-4-large` | best retrieval quality                        |
| `voyage-4`       | balanced                                      |
| `voyage-4-lite`  | lowest latency and cost — this repo's default |
| `voyage-4-nano`  | open-weight (Apache 2.0)                      |

Also worth knowing: `voyage-context-4` for contextualised chunk embeddings, and
`rerank-2.5` / `rerank-2.5-lite` for reranking (lesson 38).

## References

- [Model overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)
- [Migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide)
- [Embeddings](https://platform.claude.com/docs/en/build-with-claude/embeddings)
