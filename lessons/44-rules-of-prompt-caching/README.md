# 44 · Rules of prompt caching

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 44, _Rules of prompt caching_
>
> **2026 status: 🟠 The central claim is no longer true**

## What the lesson teaches

The rules for where breakpoints go — and, centrally: **you must place `cache_control`
manually, and move it yourself as the conversation grows.**

## What changed

That claim was true when the course was recorded. It is not true now.

Top-level `cache_control` places the breakpoint at the last cacheable block and **moves
it forward for you**. For an ordinary growing conversation that is now the correct
default, and the manual work the lesson describes is unnecessary.

Explicit block-level breakpoints have **not** been removed. They are the tool for
precise placement, not the baseline.

### When to use which

| Situation                                         | Use                                                       |
| ------------------------------------------------- | --------------------------------------------------------- |
| Ordinary growing conversation or agent loop       | **Top-level `cache_control`**                             |
| Stable system prompt + conversation               | Top-level, optionally plus one explicit system breakpoint |
| One huge fixed document, many different questions | Explicit breakpoint after the document                    |
| Large static tool collection                      | Explicit breakpoint on the last tool                      |
| Sections with different TTLs (5m vs 1h)           | Explicit breakpoints — the only way to express it         |

Max **4 breakpoints** per request. `cache_control` on a tool definition caches
everything up to and including that tool.

### The rules that did not change

1. **Prefix match, in render order: `tools` → `system` → `messages`.** A change anywhere
   invalidates everything after it.
2. **Stable content first, volatile content last.** Frozen instructions, then a
   deterministically-ordered tool list, then the varying question. If a timestamp has to
   be in the prompt, put it _after_ the last breakpoint.
3. **There is a minimum** cacheable prefix, 1024–4096 tokens by model. Below it,
   nothing caches and nothing warns you.
4. **Verify with `usage`.** `cache_read_input_tokens == 0` across repeated requests
   means something is invalidating the prefix.

### The audit checklist for "why is my hit rate zero"

- `datetime.now()` / `Date.now()` anywhere in `tools`, `system`, or an early message
- a per-request UUID or trace id in the prefix
- `json.dumps` / `JSON.stringify` of a `dict`/`Map`/`Set` whose iteration order varies
- a tool list built by iterating an unordered collection
- a system prompt below the minimum
- a changed `output_config.format` — changing it invalidates the thread's cache
- a changed model — caches are model-scoped, so a cheap/expensive cascade forfeits reuse

## The current implementation

`example.*` is a **structural analysis, not an API call** for most of its run: it builds
four request shapes and reports which prefix is stable across turns, which breakpoints
would land where, and which shape has an invalidator in it. Then it makes a small number
of real requests to confirm the prediction against `usage`.

Pass `--offline` to skip the API entirely and just read the analysis.

## Python vs TypeScript

Identical.

## Run it

```bash
npm run lesson -- 44
uv run lesson 44

npm run lesson -- 44 -- --offline   # no API calls
uv run lesson 44 -- --offline
```

## Environment variables

- `ANTHROPIC_API_KEY` (not needed with `--offline`)

## References

- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
