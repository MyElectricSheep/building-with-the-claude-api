"""Lesson 29 - Fine-grained tool streaming.

`fine_grained=True` is gone. The control is `eager_input_streaming: True` on the
individual tool, with the ordinary streaming client - no beta header.

    uv run lesson 29
"""

from __future__ import annotations

import json
import time
from typing import Any

from course.config import MODEL, create_client

PROMPT = (
    "Write a file called changelog.md containing a plausible 20-line changelog "
    "for a SQL migration formatter. Use the write_file tool."
)


def write_file_tool(eager: bool) -> dict[str, Any]:
    tool: dict[str, Any] = {
        "name": "write_file",
        "description": "Write contents to a file.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "contents": {"type": "string"},
            },
            "required": ["path", "contents"],
            "additionalProperties": False,
        },
    }
    if eager:
        # The 2026 control. Per tool, not per request. No beta header.
        tool["eager_input_streaming"] = True
    return tool


def stream_once(client, eager: bool) -> None:  # noqa: ANN001
    label = "eager_input_streaming: True" if eager else "buffered (default)"
    print(f"--- {label} ---")

    # Accumulate by CONTENT BLOCK INDEX. A turn with two tool calls interleaves
    # two streams; a single string buffer would splice them together.
    buffers: dict[int, str] = {}
    parsed: dict[int, Any] = {}
    fragments = 0
    started = time.monotonic()
    first_fragment_at: float | None = None
    mid_stream_parse_failed = False

    with client.messages.stream(
        model=MODEL,
        max_tokens=2000,
        tools=[write_file_tool(eager)],
        messages=[{"role": "user", "content": PROMPT}],
    ) as stream:
        for event in stream:
            if event.type == "content_block_start":
                buffers[event.index] = ""
            elif event.type == "content_block_delta":
                if event.delta.type == "input_json_delta":
                    fragments += 1
                    if first_fragment_at is None:
                        first_fragment_at = time.monotonic() - started
                    buffers[event.index] += event.delta.partial_json

                    # Deliberately try to parse halfway through, once, to show
                    # why you must not. NEVER do this in real code.
                    if fragments == 8 and not mid_stream_parse_failed:
                        try:
                            json.loads(buffers[event.index])
                        except json.JSONDecodeError as error:
                            mid_stream_parse_failed = True
                            print(f"  mid-stream parse at fragment 8: {error.msg}")
            elif event.type == "content_block_stop":
                # Parse ONLY here, when the block is complete.
                raw = buffers.get(event.index, "")
                if raw:
                    try:
                        parsed[event.index] = json.loads(raw)
                    except json.JSONDecodeError:
                        print(f"  block {event.index} never became valid JSON")

    elapsed = time.monotonic() - started
    payload = sum(len(value.get("contents", "")) for value in parsed.values())
    rate = f"{fragments * 1024 / payload:.1f}" if payload else "n/a"
    print(f"  input_json_delta events: {fragments}")
    print(f"  first fragment after:    {(first_fragment_at or 0) * 1000:.0f} ms")
    print(f"  total:                   {elapsed * 1000:.0f} ms")
    print(f"  payload:                 {payload} chars")
    print(f"  fragments per KB:        {rate}")
    for index, value in parsed.items():
        print(f"  block {index}: path={value.get('path')!r}")
    print()


def main() -> None:
    client = create_client()
    stream_once(client, eager=False)
    stream_once(client, eager=True)
    print(
        "Read those timings with care: the two runs generate DIFFERENT\n"
        "changelogs, so this is one sample of two different payloads, not a\n"
        "benchmark. Compare `fragments per KB`, and re-run a few times before\n"
        "believing any gap.\n\n"
        "What eager_input_streaming actually changes is that the API stops\n"
        "waiting to validate JSON before emitting - it does NOT promise more,\n"
        "smaller chunks, and you may well see fewer, larger ones.\n\n"
        "The unambiguous demonstration is the mid-stream parse above: it fails\n"
        "in both modes. Accumulate by event.index and parse only at\n"
        "content_block_stop. Partial JSON is not safe to execute, and a\n"
        "truncated eager stream may never become valid at all."
    )


if __name__ == "__main__":
    main()
