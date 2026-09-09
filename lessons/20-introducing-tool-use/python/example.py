"""Lesson 20 - Introducing tool use.

One tool, one call, one result, one follow-up: the smallest complete round trip.
Then the same request with a SERVER tool, so the difference is concrete.

    uv run lesson 20
"""

from __future__ import annotations

import json

from course.blocks import block_types, text_of, tool_uses
from course.config import MODEL, create_client
from course.tools import ReminderStore, execute_tool

CLOCK_TOOL = {
    "name": "get_current_datetime",
    "description": "Return the current date and time in UTC, ISO 8601.",
    "strict": True,
    "input_schema": {
        "type": "object",
        "properties": {},
        "required": [],
        "additionalProperties": False,
    },
}


def client_tool_round_trip(client) -> None:  # noqa: ANN001
    print("=== client tool: YOU execute it, YOU return a tool_result ===\n")
    messages = [{"role": "user", "content": "What time is it in UTC right now?"}]

    # 1. Claude decides it needs the tool.
    first = client.messages.create(
        model=MODEL, max_tokens=500, tools=[CLOCK_TOOL], messages=messages
    )
    print(f"stop_reason: {first.stop_reason}")
    print(f"blocks:      {block_types(first)}")

    calls = tool_uses(first)
    if not calls:
        print("Claude answered without the tool:")
        print(text_of(first))
        return

    call = calls[0]
    print(f"tool call:   {call.name}({json.dumps(call.input)}) id={call.id}\n")

    # 2. YOU run it. Claude never executed anything.
    result = execute_tool(call.name, call.input, ReminderStore())
    print(f"you ran it:  {json.dumps(result)}\n")

    # 3. Send the result back. The assistant turn must be preserved whole, and
    #    the tool_result must carry the matching tool_use_id.
    messages.append({"role": "assistant", "content": first.content})
    messages.append(
        {
            "role": "user",
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": call.id,
                    "content": json.dumps(result),
                }
            ],
        }
    )

    second = client.messages.create(
        model=MODEL, max_tokens=500, tools=[CLOCK_TOOL], messages=messages
    )
    print(f"stop_reason: {second.stop_reason}")
    print(f"answer:      {text_of(second)}")


def server_tool_round_trip(client) -> None:  # noqa: ANN001
    print("\n\n=== server tool: ANTHROPIC executes it, no tool_result from you ===\n")
    response = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        # A server tool. Note there is no function to implement.
        tools=[{"type": "web_search_20260318", "name": "web_search", "max_uses": 1}],
        messages=[
            {
                "role": "user",
                "content": "In one sentence: what is the Model Context Protocol?",
            }
        ],
    )
    print(f"stop_reason: {response.stop_reason}")
    print(f"blocks:      {block_types(response)}")
    print(
        "\nNotice there is no `tool_use` block for you to answer. The search ran\n"
        "server-side and its results are already in the response. Writing a\n"
        "tool_result for a server tool is a validation error."
    )
    print(f"\nanswer: {text_of(response)[:400]}")


def main() -> None:
    client = create_client()
    client_tool_round_trip(client)
    server_tool_round_trip(client)


if __name__ == "__main__":
    main()
