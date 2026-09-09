"""Lesson 7 - Response streaming.

The SDK helper is still exactly what the course teaches. What is worth adding in
2026 is that a stream carries more than text.

    uv run lesson 07
    uv run lesson 07 -- --events
"""

from __future__ import annotations

import sys

from course.blocks import format_usage
from course.config import MODEL, create_client

PROMPT = "Explain hybrid retrieval (dense + lexical) in about four sentences."


def stream_text(client) -> None:  # noqa: ANN001
    print("--- text_stream: the 90% case ---")
    with client.messages.stream(
        model=MODEL,
        max_tokens=500,
        messages=[{"role": "user", "content": PROMPT}],
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)
        final = stream.get_final_message()

    print(f"\n\nstop_reason: {final.stop_reason} | usage: {format_usage(final.usage)}")


def stream_events(client) -> None:  # noqa: ANN001
    print("\n--- raw events: what text_stream filters out ---")
    counts: dict[str, int] = {}

    with client.messages.stream(
        model=MODEL,
        max_tokens=500,
        # Ask for readable reasoning so a thinking block actually appears.
        thinking={"type": "adaptive", "display": "summarized"},
        messages=[{"role": "user", "content": PROMPT}],
    ) as stream:
        for event in stream:
            counts[event.type] = counts.get(event.type, 0) + 1
            if event.type == "content_block_start":
                print(f"\n[{event.content_block.type} block starts]")
            elif event.type == "content_block_delta":
                if event.delta.type == "thinking_delta":
                    print(event.delta.thinking, end="", flush=True)
                elif event.delta.type == "text_delta":
                    print(event.delta.text, end="", flush=True)
        final = stream.get_final_message()

    print("\n\nevent census (wire names, not the lesson's PascalCase labels):")
    for name, count in sorted(counts.items()):
        print(f"  {name:<24} {count}")
    print(f"\nstop_reason: {final.stop_reason} | usage: {format_usage(final.usage)}")


def main() -> None:
    client = create_client()
    events_only = "--events" in sys.argv
    if not events_only:
        stream_text(client)
    stream_events(client)


if __name__ == "__main__":
    main()
