"""Lesson 4 - Multi-turn conversations.

The API is stateless: memory is just the history you resend. The 2026 upgrade is
to append the whole assistant turn, not the extracted string.

    uv run lesson 04
"""

from __future__ import annotations

from typing import Any

from course.blocks import append_assistant_turn, text_of
from course.config import MODEL, create_client

TURNS = [
    "My name is Priya and I am learning the Claude API.",
    "I am building a search feature over a documentation site.",
    "What is my name, and what am I building?",
]


def main() -> None:
    client = create_client()
    messages: list[dict[str, Any]] = []

    for turn in TURNS:
        messages.append({"role": "user", "content": turn})

        response = client.messages.create(
            model=MODEL,
            max_tokens=300,
            messages=messages,
        )

        # Preserve every block. Appending only text_of(response) would drop
        # thinking blocks now, and tool_use blocks in lesson 25 onward.
        append_assistant_turn(messages, response)

        print(f"user      > {turn}")
        print(f"assistant > {text_of(response)}\n")

    print(f"History sent on the final request: {len(messages)} turns.")
    print("Nothing is stored server-side; that list is the entire memory.")


if __name__ == "__main__":
    main()
