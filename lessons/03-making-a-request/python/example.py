"""Lesson 3 - Making a request.

The whole course rests on this one call. The 2026 correction is in how you read
the response: dispatch on block type, and check stop_reason before trusting text.

    uv run lesson 03
    uv run lesson 03 -- "Explain BM25 in two sentences"
"""

from __future__ import annotations

import sys

from course.blocks import block_types, format_usage, text_of
from course.config import MODEL, create_client

DEFAULT_PROMPT = "What is quantum computing? Answer in one sentence."


def main() -> None:
    prompt = " ".join(sys.argv[1:]) or DEFAULT_PROMPT
    client = create_client()

    response = client.messages.create(
        model=MODEL,
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )

    # What actually came back. Run this once and you will never write
    # response.content[0].text again.
    print(f"model:        {response.model}")
    print(f"stop_reason:  {response.stop_reason}")
    print(f"block types:  {block_types(response)}")
    print(f"usage:        {format_usage(response.usage)}")
    print()

    if response.stop_reason == "max_tokens":
        print("[truncated - raise max_tokens]")
    elif response.stop_reason == "refusal":
        print(f"[refused: {response.stop_details}]")

    print(text_of(response))


if __name__ == "__main__":
    main()
