# 31 · The web search tool

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 31, _The web search tool_
>
> **2026 status: 🟡 Old version, not obsolete architecture**

Worth distinguishing from lesson 30. Nothing here is broken — there are simply newer
versions with more to offer.

## What the lesson teaches

Claude can search the web. Unlike every tool so far, **you do not execute it**: it is a
**server tool**, Anthropic runs it, and the results come back as content blocks in the
same response, with citations.

## What the Academy does

```python
{"type": "web_search_20250305", "name": "web_search"}
```

That version still works.

## What changed

Three versions are current, and they are **capability-keyed**, not a deprecation chain:

| `type`                | Adds                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| `web_search_20250305` | basic web search                                                                                     |
| `web_search_20260209` | **dynamic filtering** — Claude writes code that filters results before they enter the context window |
| `web_search_20260318` | **`response_inclusion`** — drop consumed result blocks from the response to cut output tokens        |

Dynamic filtering needs Claude 4.6 or later. It works by running web search from inside
code execution: on `_20260209` and later, `allowed_callers` defaults to
`["code_execution_20260120"]` and the API provisions the sandbox automatically.

> **Do not add `code_execution` to `tools` yourself when using dynamic filtering.** A
> second execution environment confuses the model. And on a model that does not support
> programmatic tool calling, you must set `allowed_callers: ["direct"]` or you get a
> 400 telling you so.

### Parameters worth knowing

`max_uses`, `allowed_domains` **or** `blocked_domains` (never both — 400), and
`user_location`. Domains are bare hostnames with an optional path, no scheme.

### Three things that surprise people

1. **Server-tool errors do not raise.** A rate limit or `max_uses_exceeded` comes back
   as HTTP **200** with a `web_search_tool_result` whose `content` is a single error
   object rather than a list. Branch on that before you index.
2. **`pause_turn`.** A long search turn can end with `stop_reason: "pause_turn"`. Send
   the assistant message back unchanged to continue.
3. **`encrypted_content` must be echoed back verbatim** on later turns, or the request
   fails with a 400. Which is another way of saying: append `response.content`, not the
   text.

Citations are always on for web search, and `cited_text`/`title`/`url` do not count
toward token usage. If you show the output to end users, show the citations.

## The current implementation

The same question run twice — `web_search_20250305` and `web_search_20260318` — printing
the block census, the number of searches (`usage.server_tool_use.web_search_requests`),
input/output tokens, tokens **per search**, and the citations.

**The raw token totals are not a benchmark, and the example says so.** The model chooses
how many searches to run, and on the run this repository was verified against the newer
version searched _twice_ and therefore used _more_ input tokens — in both languages. A
single-question A/B mostly measures search count. Dynamic filtering works per search, so
`input tokens per search` is the number to normalise on, over many questions.

Normalising is not a hedge — it changes the answer. On the verification run the filtered
version came out **cheaper per search** (~10,100 vs ~13,600 input tokens) while its
_total_ was higher, because it searched twice. Both facts are true; only one of them is
about filtering.

Use the newest version your model supports because of what it can do, not because of a
saving you can demonstrate in ten seconds.

It also handles the error-shaped result and `pause_turn` explicitly rather than assuming
the happy path.

## Python vs TypeScript

Identical. Note in TypeScript that a mixed `tools` array must not be annotated
`Anthropic.Tool[]` — that type is the custom-tool variant only.

## Run it

```bash
npm run lesson -- 31
uv run lesson 31
```

**This lesson costs more than the others.** Web search is billed per search on top of
tokens, and search results are large. `max_uses` is capped at 2 here.

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Web search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)
- [Server tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools)
- [Tool reference](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference)
- [Citations](https://platform.claude.com/docs/en/build-with-claude/citations)
