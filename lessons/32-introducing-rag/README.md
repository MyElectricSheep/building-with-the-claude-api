# 32 · Introducing Retrieval Augmented Generation

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 32, _Introducing Retrieval Augmented Generation_
>
> **2026 status: 🟢 Current — but the _reason_ changed**

## What the lesson teaches

The model does not know your documents. RAG is: find the relevant parts, put them in
the prompt, then ask.

## What the Academy does

Motivates RAG primarily as a **context window workaround**: your corpus is bigger than
the window, so you retrieve.

## What changed

The technique is unchanged. The _argument for it_ is different, and this matters
because it changes when you should reach for RAG at all.

Current Claude models have a **1M-token context window**. For a small corpus, "just put
it all in the prompt" is now a real option — and with prompt caching it can be a cheap
one (lesson 43).

So RAG in 2026 is justified by four things, none of which is window size:

| Reason          | Why it still bites at 1M tokens                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| **Corpus size** | 1M tokens is roughly 3,000 pages. A real document store is far bigger                                |
| **Cost**        | You pay for every input token on every request. Retrieving 2K tokens beats sending 800K              |
| **Latency**     | Time to first token scales with input                                                                |
| **Attention**   | More irrelevant context measurably hurts answer quality. Precision is a feature, not just an economy |

The last one is the one people miss. Stuffing the window is not free even when it fits.

## The current implementation

The same six questions answered two ways over the same six-document corpus:

1. **stuff everything** — the whole corpus in the prompt
2. **retrieve then ask** — a cheap lexical retriever (BM25, lesson 37) picks three
   chunks

It prints input tokens for each, measured with `count_tokens` — which is free — and the
answers side by side.

The takeaway is deliberately not "RAG wins". At this corpus size stuffing works fine and
often reads better. What you can see is the **token ratio**, which is the thing that
does not scale.

> This lesson needs **no `VOYAGE_API_KEY`**. It uses lexical retrieval so the concept
> lands before embeddings are introduced in lesson 34.

## Python vs TypeScript

Identical.

## Run it

```bash
npm run lesson -- 32
uv run lesson 32
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Contextual retrieval](https://www.anthropic.com/news/contextual-retrieval)
- [Context windows](https://platform.claude.com/docs/en/build-with-claude/context-windows)
- [Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting)
- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
