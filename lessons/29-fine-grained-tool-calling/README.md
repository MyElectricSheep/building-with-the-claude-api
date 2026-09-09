# 29 · Fine grained tool calling

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 29, _Fine grained tool calling_
>
> **2026 status: 🟠 Capability current, enablement syntax replaced**

## What the lesson teaches

By default, the API buffers a tool's arguments and streams them in chunks that are safe
to accumulate. For a tool whose argument is _large_ — writing a file, say — that buffering
delays the first byte. Fine-grained streaming trades that safety for latency: fragments
arrive sooner, and while they arrive the JSON is incomplete and therefore invalid.

The problem and the trade-off are unchanged.

## What the Academy does

```python
fine_grained=True    # a request-level flag
```

## What changed

The mechanism is now a **per-tool field**, and it is not a beta:

```python
tools = [
    {
        "name": "write_file",
        "description": "Write contents to a file",
        "eager_input_streaming": True,     # <- here, on the tool
        "input_schema": { ... },
    }
]
```

|       | Academy              | 2026                                                                         |
| ----- | -------------------- | ---------------------------------------------------------------------------- |
| Where | request level        | on the individual **tool definition**                                        |
| Name  | `fine_grained`       | `eager_input_streaming`                                                      |
| Beta? | a request-level beta | **no beta header, no `client.beta.*`** — plain `client.messages.stream(...)` |
| Scope | all tools            | per tool, so a big-payload tool can be eager while the rest stay buffered    |

Two constraints worth knowing:

- `eager_input_streaming` is for **user-defined tools only**. It is rejected on the
  computer-use and browser-use toolsets, which always deliver each member's input as
  one complete `input_json_delta`.
- The legacy `fine-grained-tool-streaming-2025-05-14` beta header is not the current
  mechanism.

### The part that actually matters: accumulate by block index

Whether or not you enable eager streaming, `input_json_delta` events arrive per
**content block index**. A turn with two tool calls interleaves two streams. So:

1. buffer `partial_json` into a map keyed by `event.index`;
2. parse **only** at `content_block_stop` for that index;
3. never `JSON.parse` a partial buffer, and never act on one.

With eager streaming this stops being pedantry: a truncated stream may never produce a
valid input at all. Partial JSON is not safe to execute.

## The current implementation

Streams the same request twice — buffered and eager — with a tool whose argument is a
whole file body, and prints the fragment count, time to first fragment, payload size and
fragments per KB for each, plus what a mid-stream parse attempt does at the halfway
point.

**Read the timings with care.** The two runs generate _different_ changelogs, so this is
one sample of two different payloads, not a benchmark. That is why the example prints
payload size and a normalised `fragments per KB` — and why you should re-run a few times
before believing any gap. On the run this repository was verified against, the eager mode
produced _fewer, larger_ fragments and a _higher_ time-to-first-fragment, which is a good
reminder that `eager_input_streaming` does not promise finer granularity: what it changes
is that the API stops waiting to validate JSON before emitting.

The unambiguous demonstration is the **mid-stream parse**, which fails in both modes —
that is the part you should take away.

## Python vs TypeScript

Identical. Both use the ordinary streaming client, and both key the accumulator on
`event.index`.

## Run it

```bash
npm run lesson -- 29
uv run lesson 29
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Fine-grained tool streaming](https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming)
- [Streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [Tool reference — tool definition properties](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference)
