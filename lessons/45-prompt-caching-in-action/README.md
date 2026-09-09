# 45 · Prompt caching in action

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 45, _Prompt caching in action_
>
> **2026 status: 🟡 Still works, unnecessarily manual for the common case**

## What the lesson teaches

Applying caching to a real request: explicit `cache_control` on the system block and on
the tool definitions.

## What the Academy does

```python
system=[{"type": "text", "text": big_prompt, "cache_control": {"type": "ephemeral"}}]
tools=[..., {**last_tool, "cache_control": {"type": "ephemeral"}}]
```

Nothing here is broken. It is the right code for the cases that need it.

## What changed

Only the default. For an ordinary agent loop you would now write one top-level
`cache_control` and be done (lesson 44). Explicit breakpoints are what you reach for
when you need placement the automatic breakpoint cannot express:

- a **huge fixed document** you ask many different questions about
- a **large static tool collection** that should be cached separately from the
  conversation
- **different TTLs** for different sections — the only way to express this

`cache_control` on a tool caches everything up to **and including** that tool. Because
render order is `tools → system → messages`, a breakpoint on the last tool covers the
whole tool block.

### TTL

Default **5 minutes**; `{"type": "ephemeral", "ttl": "1h"}` gives an hour at a higher
write cost. The arithmetic that decides which: a 1-hour write is more expensive, so it
pays only if you will get enough reads inside the hour that you would otherwise have
paid several 5-minute writes.

### Reading the numbers

```
cache_creation_input_tokens   written  (~1.25x a normal input token)
cache_read_input_tokens       read     (~0.1x)
input_tokens                  uncached (1x)
```

An agent loop is the ideal case: the tools and system prompt are identical on every
iteration, and the conversation only grows at the end.

## The current implementation

The reminder agent from lesson 27 run three ways over the same request, reporting real
cost per run in tokens:

1. **no caching** — the baseline
2. **automatic** — one top-level `cache_control`
3. **explicit** — a breakpoint on the last tool and one on the system block

Then the same comparison with **`ttl: "1h"`**, so the write-cost difference is a number
rather than a paragraph.

The interesting column is `cache_read_input_tokens` on iterations 2+ of the loop: that
is where an agent gets its money back.

**One artifact to read past.** The four runs share a system prompt, so run 4 reads a
cache that runs 2 and 3 already paid to write. On the run this repository was verified
against that made `ttl=1h` look three times better than automatic caching (≈4,500 vs
≈14,000 billed-equivalent) when most of the difference is simply that it wrote nothing.
Compare runs 1 and 2 for the honest before/after; to compare TTLs properly you need
separate processes, and a wait longer than five minutes between them.

## Python vs TypeScript

Identical.

## Run it

```bash
npm run lesson -- 45
uv run lesson 45
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Tool use with prompt caching](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-use-with-prompt-caching)
