# 26 · Multi-turn conversations with tools

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 26, _Multi-Turn conversations with tools_
>
> **2026 status: 🟡 Concept current, the helper is outdated**

## What the lesson teaches

Combine lesson 4 (resend the history) with lesson 25 (send `tool_result` blocks): a
conversation where tool calls and ordinary turns interleave, and the user can ask a
follow-up that depends on what a tool returned three turns ago.

## What the Academy does

Uses the shared `chat()` helper, which still carries `temperature=1.0`, and appends the
assistant's _text_ to the history.

## What changed

Two fixes, one of them subtle:

1. **Drop `temperature`.** The shared helper's default breaks every call in this
   lesson on current models. Python SDK v1 raises `TypeError` locally; the API returns
   400 on Claude 4.7+. See lesson 6.

2. **Preserve `thinking` blocks across turns.** This is the subtle one. When you resend
   history, the assistant turns must contain the blocks you received —
   `thinking`, `redacted_thinking` and `tool_use` included, unchanged. Reasons:

   - a `tool_result` is invalid without the `tool_use` block it answers;
   - thinking blocks carry the model's reasoning state into the next turn, and
     rewriting or dropping them degrades multi-turn tool use.

   Concretely: `messages.append({"role": "assistant", "content": response.content})`,
   never `{"content": text_of(response)}`.

Also worth knowing (not needed here): for conversations that grow past the context
window, current models support server-side
[compaction](https://platform.claude.com/docs/en/build-with-claude/compaction) — and it
has the same rule, more strictly. You must append `response.content` so the
`compaction` blocks survive.

## The current implementation

A three-turn conversation where the follow-ups depend on earlier tool results:

1. "Remind me to renew the SSO certificate a week from now." → three tool calls
2. "Actually make that two days earlier." → needs the datetime from turn 1
3. "What did I ask you to remind me about, and when?" → answered from history alone

Then it prints the shape of the accumulated history, and re-runs the final turn with
the thinking blocks stripped out so you can compare.

## Python vs TypeScript

Identical.

## Run it

```bash
npm run lesson -- 26
uv run lesson 26
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Working with the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)
- [Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [Compaction](https://platform.claude.com/docs/en/build-with-claude/compaction)
