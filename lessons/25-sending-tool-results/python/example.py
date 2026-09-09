"""Lesson 25 - Sending tool results.

The correct round trip: find the call by type, preserve the whole assistant
turn, match tool_use_id, batch every result into ONE user message - and return
an error result rather than dropping it.

    uv run lesson 25
"""

from __future__ import annotations

import json

from course.blocks import append_assistant_turn, block_types, text_of, tool_uses
from course.config import MODEL, create_client
from course.tools import TOOL_DEFINITIONS, ReminderStore, execute_tool


def results_for(response, store: ReminderStore, force_error: bool) -> list[dict]:  # noqa: ANN001
    """Build one tool_result per tool_use block. Never skip a failing call."""
    results = []
    for call in tool_uses(response):
        try:
            if force_error and call.name == "get_current_datetime":
                raise RuntimeError("clock service unavailable (simulated)")
            value = execute_tool(call.name, call.input, store)
            results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": call.id,  # the ID, not the index, not the name
                    "content": json.dumps(value),
                }
            )
            print(f"    {call.name} -> {json.dumps(value)}")
        except Exception as error:  # noqa: BLE001
            # An unanswered tool_use makes the next request invalid. Always
            # return something, marked as an error the model can act on.
            results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": call.id,
                    "content": f"{type(error).__name__}: {error}",
                    "is_error": True,
                }
            )
            print(f"    {call.name} -> ERROR {error}")
    return results


def main() -> None:
    client = create_client()
    store = ReminderStore()
    messages = [{"role": "user", "content": "What is the current UTC time?"}]

    # Turn 1: force the clock tool to fail, so you can watch the recovery.
    response = client.messages.create(
        model=MODEL, max_tokens=1000, tools=TOOL_DEFINITIONS, messages=messages
    )
    print(f"turn 1 blocks: {block_types(response)}")

    # Preserve the WHOLE assistant turn. Extracting only the text would drop the
    # tool_use block that the tool_result answers, and the request would fail.
    append_assistant_turn(messages, response)

    results = results_for(response, store, force_error=True)
    if results:
        # All results in ONE user message. Splitting them across several
        # messages trains the model to stop making parallel calls.
        messages.append({"role": "user", "content": results})

    # Turn 2: the model sees is_error and tries again.
    response = client.messages.create(
        model=MODEL, max_tokens=1000, tools=TOOL_DEFINITIONS, messages=messages
    )
    print(f"turn 2 blocks: {block_types(response)}")
    append_assistant_turn(messages, response)

    results = results_for(response, store, force_error=False)
    if results:
        messages.append({"role": "user", "content": results})
        response = client.messages.create(
            model=MODEL, max_tokens=1000, tools=TOOL_DEFINITIONS, messages=messages
        )
        print(f"turn 3 blocks: {block_types(response)}")

    print(f"\nanswer: {text_of(response)}")
    print(
        "\nNote how the error result kept the conversation valid. Dropping it\n"
        "would have left an unanswered tool_use and the next request would 400."
    )


if __name__ == "__main__":
    main()
