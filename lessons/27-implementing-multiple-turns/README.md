# 27 · Implementing multiple turns

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 27, _Implementing multiple turns_
>
> **2026 status: 🟢 Still valid — and no longer your only option**

## What the lesson teaches

The agent loop:

```
call Claude → any tool_use blocks? → execute → append tool_results → call again
                     ↓ no
                   done
```

Learning this by hand is worth it. It is the protocol, and you cannot debug the
automatic version without it.

## What the Academy does

Writes the loop manually. Correct, and still correct.

## What changed

Nothing was deprecated. What is new is that **the SDKs now ship a tool runner** that
drives this loop for you:

|        | Python                                                                          | TypeScript                                                                                |
| ------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Define | `@beta_tool` on a typed function; schema comes from the signature and docstring | `betaZodTool({name, description, inputSchema, run})` (or `betaTool` with raw JSON Schema) |
| Run    | `client.beta.messages.tool_runner(...)` → iterate                               | `client.beta.messages.toolRunner(...)` → `await` it, or iterate                           |

It is a **beta** helper on `client.beta.messages`, not a separate package.

### Which to use

| Need                                                                           | Use                                                                         |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| An ordinary custom-tool agent                                                  | **Tool runner.** Less code, same protocol                                   |
| Approval gates, logging, custom retry, result rewriting                        | Tool runner — its per-turn hooks cover these; you do not need a manual loop |
| A control flow the hooks do not fit, a custom transport, or no beta dependency | Manual loop                                                                 |

> **Tool runner ≠ Claude Agent SDK.** The tool runner is part of the regular API SDK and
> loops over tools _you_ define. The Claude Agent SDK (`claude-agent-sdk` /
> `@anthropic-ai/claude-agent-sdk`) is Claude Code as a library, with built-in file and
> bash tools. Different package, different job.

### Two things the loop needs that the lesson does not mention

1. **A turn limit.** An unbounded `while True` around a paid API call is a bug waiting
   for a model that keeps calling tools. Both implementations here cap it and raise.
2. **`pause_turn`.** A long-running _server_ tool can end a turn with
   `stop_reason: "pause_turn"`. Append the assistant turn and re-send to continue. The
   manual loop here handles it; **the tool runner does not auto-resume it** — it exits
   and hands you a silently truncated answer, so check `stop_reason` on the final
   message.

## The current implementation

`example.*` runs the **same request twice**, once through the manual loop and once
through the tool runner, and prints the turn-by-turn trace of each so you can see they
do the same thing.

The manual loop is the one to read. The tool runner is the one to use.

## Python vs TypeScript

The runner APIs differ more than usual:

- **Python** — `@beta_tool` derives the schema from the function signature and
  docstring. The runner is an iterable of `BetaMessage`s. It cannot be resumed mid-loop
  after `pause_turn`; you restart it with the paused turn appended.
- **TypeScript** — `betaZodTool` takes a Zod schema, giving you typed `input` inside
  `run`. The runner can be resumed with `runner.pushMessages(...)`.

## Run it

```bash
npm run lesson -- 27
uv run lesson 27

npm run lesson -- 27 -- --manual   # just the hand-written loop
npm run lesson -- 27 -- --runner   # just the tool runner
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [Implement tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use)
- [Server tools — `pause_turn`](https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools)
