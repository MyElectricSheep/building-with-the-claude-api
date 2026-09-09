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

# Adaptive thinking DECIDES whether to think. An easy question gets no
# thinking blocks at all - which is the feature working, not a failure. This
# problem is hard enough to reliably trigger it.
PROBLEM = (
    "A 3x3 grid holds each of the numbers 1-9 exactly once. Every row sums to "
    "15 and both diagonals sum to 15. The centre cell is not 5. Either produce "
    "such a grid or prove none exists. Reason carefully and show the argument."
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

    blocks = [b for b in response.content if b.type == "thinking"]
    print(f"--- effort={effort} display={display} ---")
    print(f"  usage:    {format_usage(response.usage)}")
    print(f"  wall:     {elapsed:.1f}s")
    print(f"  thinking: {len(blocks)} block(s), {len(summaries)} with readable text")
    if summaries:
        print(f"    {summaries[0][:180]}...")
    elif not blocks:
        # Not a failure: adaptive thinking decided this did not need it.
        print("    (adaptive thinking chose not to think - that is the feature)")
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
    if thinking_blocks and not non_empty:
        print(
            "\n  There it is: the block is present and billed, and its text is\n"
            "  empty. A UI streaming thinking text without display='summarized'\n"
            "  shows a long pause, not a bug.\n"
        )
    else:
        print(
            "\n  (No thinking blocks this run - adaptive thinking decided the\n"
            "  question did not need it. Re-run, or raise --efforts.)\n"
        )

    print(
        "effort controls reasoning depth and token spend. It is NOT a\n"
        "temperature replacement - see lesson 6. And echo thinking blocks back\n"
        "unchanged when you continue the conversation - see lesson 26."
    )


if __name__ == "__main__":
    main()
