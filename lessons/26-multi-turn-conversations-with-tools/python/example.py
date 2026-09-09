"""Lesson 26 - Multi-turn conversations with tools.

Tool calls and ordinary turns interleave. The 2026 fixes: no `temperature`, and
preserve every block of every assistant turn - thinking included.

    uv run lesson 26
"""

from __future__ import annotations

import json
from typing import Any

from course.blocks import append_assistant_turn, text_of, tool_uses
from course.config import MODEL, create_client
from course.tools import TOOL_DEFINITIONS, ReminderStore, execute_tool

TURNS = [
    "Remind me to renew the SSO certificate a week from now.",
    "Actually, make that two days earlier.",
    "What did I ask you to remind me about, and when?",
]


def run_turn(client, messages: list[dict[str, Any]], store: ReminderStore) -> str:  # noqa: ANN001
    """Drive tool calls until the model produces a final answer for this turn."""
    for _ in range(8):
        response = client.messages.create(
            model=MODEL,
            max_tokens=1500,
            tools=TOOL_DEFINITIONS,
            # No `temperature` - the Academy helper's default breaks here.
            messages=messages,
        )
        # Every block, unchanged. A tool_result is invalid without its tool_use,
        # and thinking blocks carry reasoning state into the next turn.
        append_assistant_turn(messages, response)

        calls = tool_uses(response)
        if not calls:
            return text_of(response)

        results = []
        for call in calls:
            try:
                value = execute_tool(call.name, call.input, store)
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": call.id,
                        "content": json.dumps(value),
                    }
                )
                print(f"    [tool] {call.name} -> {json.dumps(value)}")
            except Exception as error:  # noqa: BLE001
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": call.id,
                        "content": str(error),
                        "is_error": True,
                    }
                )
                print(f"    [tool] {call.name} -> ERROR {error}")
        messages.append({"role": "user", "content": results})
    raise RuntimeError("turn limit reached")


def main() -> None:
    client = create_client()
    store = ReminderStore()
    messages: list[dict[str, Any]] = []

    for turn in TURNS:
        print(f"user      > {turn}")
        messages.append({"role": "user", "content": turn})
        answer = run_turn(client, messages, store)
        print(f"assistant > {answer}\n")

    print("=== accumulated history ===")
    for index, message in enumerate(messages):
        content = message["content"]
        if isinstance(content, str):
            shape = "text"
        else:
            shape = ", ".join(
                block.type if hasattr(block, "type") else block.get("type", "?")
                for block in content
            )
        print(f"  [{index}] {message['role']:<9} {shape}")

    thinking_blocks = sum(
        1
        for message in messages
        if not isinstance(message["content"], str)
        for block in message["content"]
        if getattr(block, "type", None) in ("thinking", "redacted_thinking")
    )
    print(f"\n{thinking_blocks} thinking block(s) preserved across the conversation.")
    print(
        "Appending text_of(response) instead of response.content would have\n"
        "dropped all of them - and every tool_use block with them, which would\n"
        "have made the tool_result messages invalid."
    )
    print(f"\nreminders: {store.list()}")


if __name__ == "__main__":
    main()
