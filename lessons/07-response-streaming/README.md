# 07 · Response streaming

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 7, _Response streaming_
>
> **2026 status: 🟢 Current**

## What the lesson teaches

Without streaming you wait for the whole response. With streaming you receive
incremental events and can render text as it is produced.

## What the Academy does

```python
with client.messages.stream(...) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

This is still, word for word, what the current documentation shows.

## What changed

Nothing broke. Two clarifications and one upgrade:

1. **Event names.** The lesson labels events conceptually (`MessageStart`,
   `ContentBlockDelta`…). The wire format uses snake_case: `message_start`,
   `content_block_start`, `content_block_delta`, `content_block_stop`,
   `message_delta`, `message_stop`. You only see these if you drop below the SDK
   helper.

2. **A stream is not only text.** With adaptive thinking on, you will also see
   `thinking_delta` events, and with tools, `input_json_delta`. `text_stream`
   quietly filters to text deltas — convenient, but do not mistake it for "the
   whole stream".

3. **Streaming is now the recommended default for large `max_tokens`.** Current
   models support up to 128K output tokens, and the SDKs require streaming above a
   threshold to avoid HTTP timeouts. Use `stream.get_final_message()` /
   `stream.finalMessage()` when you want the assembled `Message` back.

## The current implementation

`example.*` streams the same prompt twice:

- **text mode** — the `text_stream` / `on("text")` helper, the 90% case;
- **event mode** — the raw event loop, so you can see `message_start`,
  `content_block_start`, `thinking_delta`, `text_delta` and `message_delta` go past.

Then it calls `get_final_message()` to show that you still get a normal `Message`
with `stop_reason` and `usage`.

Pass `--events` to run only the event view.

## Python vs TypeScript

Python uses a context manager (`with client.messages.stream(...) as stream`) and
`stream.text_stream`. TypeScript returns an async-iterable stream object; use
`for await (const event of stream)` for events, `stream.on("text", …)` for deltas,
and `await stream.finalMessage()` for the assembled result.

Do **not** wrap TypeScript `.on()` handlers in `new Promise()` to collect the final
message — `finalMessage()` already handles completion, error and abort.

## Run it

```bash
npm run lesson -- 07
uv run lesson 07

npm run lesson -- 07 -- --events
uv run lesson 07 -- --events
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [Messages API reference](https://platform.claude.com/docs/en/api/messages/create)
