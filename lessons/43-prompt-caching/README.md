# 43 · Prompt caching

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 43, _Prompt caching_
>
> **2026 status: 🟡 Economics correct, the API got easier**

## What the lesson teaches

If a large chunk of your prompt is identical between requests, cache it. Cached input is
roughly **90% cheaper** to read; writing to the cache costs about **1.25×** a normal
input token.

The economics are unchanged, and so are the TTLs: **5 minutes** by default, with a
**1-hour** option at a higher write cost.

## What the Academy does

Explains the mechanism and puts `cache_control` on individual content blocks.

## What changed

### Top-level `cache_control`

You can now put `cache_control` on the **request**:

```python
response = client.messages.create(
    model=MODEL,
    max_tokens=2000,
    cache_control={"type": "ephemeral"},   # the whole request, one line
    system=BIG_SYSTEM_PROMPT,
    messages=messages,
)
```

Claude places the breakpoint at the last cacheable block and **moves it forward as the
conversation grows**. For an ordinary chat or agent, this is now the right default and
the block-level version is the specialised tool. Lesson 44 goes into when to use which.

### What "automatic" does and does not mean

Caching is still **opt-in**. What became automatic is _where the moving breakpoint
goes_, not whether caching happens. Omit `cache_control` entirely and nothing is cached.

## The mechanics that actually determine whether it works

This is the part the lesson is thin on and it is where every real problem lives.

**Caching is a prefix match.** The render order is:

```
tools  →  system  →  messages
```

Any byte change anywhere in the prefix invalidates everything after it. So:

- a `datetime.now()` in your system prompt means you will never get a cache hit;
- so does a tool list assembled from an unordered `dict`/`Set`;
- so does a per-request UUID, or `json.dumps` of an unsorted object.

**There is a minimum.** The minimum cacheable prefix is model-dependent, roughly
1024–4096 tokens. A short system prompt silently does not cache — no error, no warning.

**Verify, do not assume.** Sending `cache_control` is not evidence of a cache hit:

```python
response.usage.cache_creation_input_tokens   # written (~1.25x cost)
response.usage.cache_read_input_tokens       # read (~0.1x cost)
response.usage.input_tokens                  # uncached (full cost)
```

If `cache_read_input_tokens` is 0 across repeated requests with a stable prefix,
something is invalidating it.

Max **4 breakpoints** per request.

## The current implementation

A document large enough to actually exceed the minimum (the whole corpus, repeated to
clear the threshold), asked three questions in a row, with `usage` printed each time so
you watch the write on request 1 become reads on 2 and 3.

Then the same three requests with **a timestamp injected into the system prompt** — the
single most common silent invalidator — so you can see `cache_read_input_tokens` stay at
zero and the cost stay flat.

## Python vs TypeScript

Identical.

## Run it

```bash
npm run lesson -- 43
uv run lesson 43
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
