# 25 · Sending tool results

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 25, _Sending tool results_
>
> **2026 status: 🟠 Protocol correct, the example is unsafe**

## What the lesson teaches

After you execute a tool you send the result back as a `tool_result` block in the next
**user** message, carrying the `tool_use_id` of the call it answers.

The protocol is unchanged and still exactly this.

## What the Academy does

```python
tool_input = response.content[1].input
tool_use_id = response.content[1].id
```

## What changed

`response.content[1]` is unsafe on current models — see lesson 24. Find the block by
type:

```python
calls = [b for b in response.content if b.type == "tool_use"]
```

Four rules that the lesson's single-tool example does not have room to show, and that
you will hit immediately afterwards:

1. **Append the whole assistant turn first.** `messages.append({"role": "assistant",
"content": response.content})` — every block, including `thinking`. Extracting the
   text loses the `tool_use` block the `tool_result` is answering, and the request fails.
2. **`tool_use_id` must match.** Not the index, not the name. The id.
3. **All results go in ONE user message.** If a turn contains three `tool_use` blocks,
   send three `tool_result` blocks in a single user message. Splitting them across
   several messages is not just untidy — it trains the model to stop making parallel
   calls (lesson 28).
4. **A failed tool still needs a result.** Return `is_error: true` with a message the
   model can act on. Dropping it leaves an unanswered `tool_use` and the request fails.

The other 2026 addition: the SDK **tool runner** does all of this for you (lesson 27).
Learn the manual version once — you need it to debug the automatic one.

## The current implementation

- `example.*` — the correct round trip: find by type, preserve the assistant turn,
  match ids, batch results, and deliberately force a tool error so you can see
  `is_error: true` come back and the model recover from it.
- `legacy.*` — the positional version. It prints what `content[1]` actually is on a
  current model, then attempts the access so you see the failure.

## Python vs TypeScript

TypeScript will not compile `response.content[1].input` at all — `ContentBlock` is a
union. `Anthropic.ToolResultBlockParam` is the type of the result block.

## Run it

```bash
npm run lesson -- 25
uv run lesson 25

npm run lesson -- 25 legacy
uv run lesson 25 legacy
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [Handle tool results](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use)
- [Migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide)
