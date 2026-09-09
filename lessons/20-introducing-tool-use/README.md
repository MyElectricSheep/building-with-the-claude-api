# 20 · Introducing tool use

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 20, _Introducing tool use_
>
> **2026 status: 🟡 Concept current, the architecture has grown**

## What the lesson teaches

A model cannot look up today's date, query your database, or send an email. Tool use is
the protocol for letting it ask _you_ to do those things:

```
you describe tools  →  Claude returns a tool_use block  →  you run it
                    ←  you return a tool_result         ←
```

Claude never executes anything. It emits a structured request.

## What the Academy does

Introduces the loop and the `tools` parameter.

## What changed

The loop is unchanged. What has grown is the **taxonomy**, and it is the thing to
learn in 2026:

| Kind            | Who runs it                | You return a `tool_result`?                                    | Examples                                                                                                                         |
| --------------- | -------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Client tool** | Your application           | **Yes**                                                        | Anything you define; also `bash_20250124`, `text_editor_20250728`, `memory_20250818` — Anthropic defines the schema, you execute |
| **Server tool** | Anthropic's infrastructure | **No** — results arrive as content blocks in the same response | `web_search_20260318`, `web_fetch_20260318`, `code_execution_20260521`, tool search, the advisor tool                            |

Getting this wrong is the most common beginner error with server tools: people write a
`tool_result` for `web_search` and get a validation error. Lesson 31 shows the server
side; lessons 21–28 are all client tools.

Three more things exist now that the lesson predates. You do not need them yet, but you
should know the names:

- **`strict: true`** — makes the argument schema a generation constraint (lesson 23)
- **The SDK tool runner** — drives the loop for you (lesson 27)
- **Tool search + programmatic tool calling** — for large toolsets (lesson 28)

Also note the lesson's framing that you "tell Claude in the prompt that a capability
exists". You do not. Tools go in the top-level `tools` parameter, and the model is
trained to use that channel.

## The current implementation

The smallest complete round trip: one tool, one call, one result, one follow-up.
No loop yet — lesson 27 adds that. The example prints each step so the protocol is
visible.

It also declares a **server** tool alongside the client tool and shows what comes back,
so the distinction is concrete rather than described.

## Python vs TypeScript

Identical. TypeScript's `Anthropic.Tool` type covers custom tools only — the
Anthropic-defined and server tools are separate members of a union, so do **not**
annotate a mixed array as `Anthropic.Tool[]`. Let inference do it, or use
`Anthropic.Messages.ToolUnion[]`.

## Run it

```bash
npm run lesson -- 20
uv run lesson 20
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [Tool reference](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference)
- [Server tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools)
