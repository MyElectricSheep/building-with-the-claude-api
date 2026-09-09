# 04 · Multi-turn conversations

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 4, _Multi-Turn conversations_
>
> **2026 status: 🟢 Current**

## What the lesson teaches

The Messages API is **stateless**. There is no session on Anthropic's side. To give
Claude memory of the conversation, you resend the whole history on every request:

```
[user, assistant, user, assistant, user]  ──►  API
```

## What the Academy does

Appends `{"role": "assistant", "content": text}` after each response and resends the
array. Conceptually correct, and the message structure has not changed.

## What changed

Nothing was deprecated. One habit needs upgrading:

> **Append the whole `response.content`, not just the text.**

The Academy stores the extracted string. On current models that silently discards
`thinking` blocks (and, once you reach tool use, `tool_use` blocks). Losing them costs
you the model's reasoning state on the next turn, and in a tool loop it breaks the
`tool_use` → `tool_result` pairing outright.

```python
# Academy - lossy
messages.append({"role": "assistant", "content": text})

# Current - preserves every block
messages.append({"role": "assistant", "content": response.content})
```

Two newer features are worth knowing exist, though neither is needed here:

- **[Compaction](https://platform.claude.com/docs/en/build-with-claude/compaction)** —
  server-side summarisation for conversations approaching the context window.
- **[Mid-conversation system messages](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)** —
  append `{"role": "system", ...}` to `messages` for an operator instruction that
  arrives mid-conversation, instead of editing the top-level `system` (which would
  invalidate the prompt cache).

## The current implementation

A three-turn conversation that proves Claude retains earlier context, with the full
content blocks preserved. The last turn asks a question that is only answerable from
turn 1.

## Python vs TypeScript

Identical. Type `messages` as `Anthropic.MessageParam[]` in TypeScript rather than
defining your own `ChatMessage` interface — the SDK already exports it.

## Run it

```bash
npm run lesson -- 04
uv run lesson 04
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Working with the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)
- [Compaction](https://platform.claude.com/docs/en/build-with-claude/compaction)
