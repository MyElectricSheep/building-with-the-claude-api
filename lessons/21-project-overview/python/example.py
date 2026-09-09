"""Lesson 21 - Project overview.

The three reminder tools as the API sees them, then one end-to-end request so
you can watch them chain.

    uv run lesson 21
"""

from __future__ import annotations

import json

from course.blocks import append_assistant_turn, text_of, tool_uses
from course.config import MODEL, create_client
from course.tools import TOOL_DEFINITIONS, ReminderStore, execute_tool

REQUEST = "Remind me to renew the SSO certificate a week from now."


def main() -> None:
    print("=== the three tools, as the API sees them ===\n")
    for tool in TOOL_DEFINITIONS:
        print(f"{tool['name']}")
        print(f"  {tool['description']}")
        print(f"  strict: {tool['strict']}")
        print(f"  schema: {json.dumps(tool['input_schema'])}\n")

    print("Exactly one of these mutates state: set_reminder. It is the only one")
    print("that needs idempotency and authorisation - strict does not help there.\n")

    client = create_client()
    store = ReminderStore()
    messages = [{"role": "user", "content": REQUEST}]

    print(f"=== one request: {REQUEST!r} ===\n")

    for turn in range(1, 9):
        response = client.messages.create(
            model=MODEL, max_tokens=1000, tools=TOOL_DEFINITIONS, messages=messages
        )
        append_assistant_turn(messages, response)

        calls = tool_uses(response)
        if not calls:
            print(f"turn {turn}: done")
            print(f"\n{text_of(response)}")
            break

        results = []
        for call in calls:
            print(f"turn {turn}: {call.name}({json.dumps(call.input)})")
            try:
                value = execute_tool(call.name, call.input, store)
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": call.id,
                        "content": json.dumps(value),
                    }
                )
                print(f"         -> {json.dumps(value)}")
            except Exception as error:  # noqa: BLE001
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": call.id,
                        "content": str(error),
                        "is_error": True,
                    }
                )
                print(f"         -> ERROR {error}")
        messages.append({"role": "user", "content": results})
    else:
        print("turn limit reached")

    print(f"\nreminders created: {store.list()}")


if __name__ == "__main__":
    main()
