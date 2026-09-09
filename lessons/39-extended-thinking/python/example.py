"""Lesson 39 - Adaptive thinking and effort.

`budget_tokens` is gone. Reasoning is on by default and you tune the budget with
output_config.effort - which is NOT a temperature replacement.

    uv run lesson 39
    uv run lesson 39 -- --efforts low,high
"""

from __future__ import annotations

import argparse
import time

from course.blocks import format_usage, text_of, thinking_of
from course.config import MODEL, create_client

PROBLEM = (
    "A deploy pipeline runs 4 minutes of unit tests, then 9 minutes of "
    "integration tests, then a rollout in three stages 10 minutes apart. "
    "The rollout aborts if canary error rate exceeds 0.5%. If a bad commit "
    "lands at 14:00 and the canary trips at the second stage, what is the "
    "earliest wall-clock time a rollback could complete, given a rollback "
    "takes 90 seconds and someone must first notice the abort? State your "
    "assumptions."
)


def run(client, effort: str, display: str) -> None:  # noqa: ANN001
    started = time.monotonic()
    response = client.messages.create(
        model=MODEL,
        max_tokens=8000,
        thinking={"type": "adaptive", "display": display},
        # effort lives INSIDE output_config, not at the top level.
        output_config={"effort": effort},
        messages=[{"role": "user", "content": PROBLEM}],
    )
    elapsed = time.monotonic() - started
    summaries = thinking_of(response)

    print(f"--- effort={effort} display={display} ---")
    print(f"  usage:    {format_usage(response.usage)}")
    print(f"  wall:     {elapsed:.1f}s")
    print(f"  thinking: {len(summaries)} summarised block(s)")
    if summaries:
        print(f"    {summaries[0][:180]}...")
    print(f"  answer:   {text_of(response).strip()[:220]}...\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--efforts", default="low,high,max")
    args = parser.parse_args()

    client = create_client()

    for effort in args.efforts.split(","):
        run(client, effort.strip(), "summarized")

    # The surprise: display defaults to "omitted" on current models. The
    # thinking blocks are there and billed; the text is empty.
    print("--- the same request with `display` left at its default ---")
    response = client.messages.create(
        model=MODEL,
        max_tokens=8000,
        thinking={"type": "adaptive"},
        output_config={"effort": "low"},
        messages=[{"role": "user", "content": PROBLEM}],
    )
    thinking_blocks = [b for b in response.content if b.type == "thinking"]
    non_empty = [b for b in thinking_blocks if (b.thinking or "").strip()]
    print(f"  thinking blocks present: {len(thinking_blocks)}")
    print(f"  with readable text:      {len(non_empty)}")
    print(f"  usage:                   {format_usage(response.usage)}")
    print(
        "\n  The blocks are billed either way. A UI streaming thinking text\n"
        "  without display='summarized' shows a long pause, not a bug.\n"
    )

    print(
        "effort controls reasoning depth and token spend. It is NOT a\n"
        "temperature replacement - see lesson 6. And echo thinking blocks back\n"
        "unchanged when you continue the conversation - see lesson 26."
    )


if __name__ == "__main__":
    main()
