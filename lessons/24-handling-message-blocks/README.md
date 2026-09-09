# 24 · Handling message blocks

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 24, _Handling message blocks_
>
> **2026 status: 🟠 Needs real modernization**

This is the lesson whose correction matters most across the whole course. Lessons 25,
26 and 27 all inherit the habit it teaches.

## What the lesson teaches

`response.content` is a list of blocks. Iterate it.

The _idea_ is right. What is outdated is the mental model of **what is in the list**.

## What the Academy does

Treats a response as essentially `text` blocks plus `tool_use` blocks, and reaches for
positions:

```python
tool_input = response.content[1].input
tool_use_id = response.content[1].id
```

## What changed

Current models run **adaptive thinking by default**. A response can be any of:

```
content[0] -> thinking      content[0] -> thinking      content[0] -> text
content[1] -> text          content[1] -> tool_use
content[2] -> tool_use
```

…and, once you use server tools, also `server_tool_use`,
`web_search_tool_result`, `bash_code_execution_tool_result`, `compaction`, and more.

So:

- `content[0].text` raises or silently returns the wrong thing.
- `content[1].input` is not reliably the tool call.
- Anthropic calls this out explicitly as a migration requirement.

**Always dispatch on `block.type`.**

### The block types you will actually meet

| `type`                                                         | Where from                | What to do                                          |
| -------------------------------------------------------------- | ------------------------- | --------------------------------------------------- |
| `text`                                                         | always                    | concatenate                                         |
| `thinking`                                                     | adaptive thinking         | display if you want; **always echo back unchanged** |
| `redacted_thinking`                                            | safety-redacted reasoning | opaque; echo back unchanged                         |
| `tool_use`                                                     | client tools              | execute, return a `tool_result`                     |
| `server_tool_use`                                              | server tools              | nothing — informational                             |
| `web_search_tool_result`, `bash_code_execution_tool_result`, … | server tools              | read the result                                     |

### One more trap: thinking display

On current models `thinking.display` defaults to **`"omitted"`** — the `thinking` blocks
are still there and still billed, but their text is empty. If you want readable
reasoning you must ask: `thinking: {type: "adaptive", display: "summarized"}`.

A UI that streams `thinking` text without setting `display` shows a long pause, not a
bug.

## The current implementation

Sends one request that reliably produces a mixed response — a tool available, thinking
on, `display: "summarized"` — and then walks `response.content` with an exhaustive
`switch` / `if` chain, printing what each block is and what you would do with it.

Then it prints the exact index the Academy would have read, next to the index the tool
call actually landed on, so the failure is not hypothetical.

## Python vs TypeScript

TypeScript's `ContentBlock` is a discriminated union, so `switch (block.type)` narrows
and an unhandled case can be made a compile error with a `never` check. Python has no
such guard, which is why the positional habit survived — the helpers in
`shared/python/course/blocks.py` do the dispatch for you.

## Run it

```bash
npm run lesson -- 24
uv run lesson 24
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Working with the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)
- [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [Migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide)
