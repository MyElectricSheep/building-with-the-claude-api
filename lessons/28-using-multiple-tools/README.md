# 28 · Using multiple tools

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 28, _Using multiple tools_
>
> **2026 status: 🟡 Fine for small toolsets; the API grew past it**

## What the lesson teaches

Hand Claude several tool schemas at once and let it route between them; you dispatch on
`tool_use.name`.

Correct, and the right default for a handful of tools.

## What changed

Three things, in increasing order of how much they change your code.

### 1. Parallel tool calls — the one that bites

A single assistant turn can contain **several** `tool_use` blocks. Claude 4 models do
this by default when the calls are independent.

- Execute them **concurrently** (they are independent — that is why the model batched
  them).
- Return **every** `tool_result` in **one** user message.

Splitting the results across multiple user messages is the trap. It is not just untidy:
it trains the model to stop making parallel calls, and you quietly lose the speedup. If
one of the calls failed, its result still goes in that message, with `is_error: true`.

If you genuinely need one call at a time, ask for it: `disable_parallel_tool_use: true`
on `tool_choice`.

### 2. Tool search — for large catalogs

Beyond a few dozen tools, every definition sits in the system prompt on every request.
**Tool search** fixes that: mark tools `defer_loading: true` and add a search tool
(`tool_search_tool_regex_20251119` or `tool_search_tool_bm25_20251119`). Deferred tools
are excluded from the rendered prompt entirely — which also means they do not
invalidate your prompt cache. Up to 10,000 deferred definitions are supported.

Two rules: the search tool itself must not defer, and at least one tool must be
non-deferred, or you get `400 All tools have defer_loading set`.

### 3. Programmatic tool calling — for tool-heavy chains

When a task is "call A, feed it to B, feed that to C, compare", each hop is a model
round trip and every intermediate result lands in the context window. **Programmatic
tool calling** lets Claude write code that calls your tools from inside the code
execution sandbox, returning only the final answer.

Add `{"type": "code_execution_20260120", "name": "code_execution"}` and set
`"allowed_callers": ["code_execution_20260120"]` on the tools it may call. Not
compatible with `strict: true`, forced `tool_choice`, or `disable_parallel_tool_use`.

## The current implementation

A request that forces genuine parallelism — three independent city lookups — so you can
see multiple `tool_use` blocks in one turn. The example:

1. prints how many calls arrived in each turn,
2. runs them concurrently (`Promise.all` / a thread pool),
3. returns all results in one user message,
4. then re-runs with `disable_parallel_tool_use: true` so you can compare the turn count.

## Python vs TypeScript

`Promise.all` versus `ThreadPoolExecutor`. Same protocol either side.

## Run it

```bash
npm run lesson -- 28
uv run lesson 28
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [Tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)
- [Programmatic tool calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)
