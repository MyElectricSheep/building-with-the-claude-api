"""Lesson 23 - Tool schemas, and the `strict` flag the Academy predates.

Same request, loose schema vs strict schema, then the two errors people actually
hit when adopting strict.

    uv run lesson 23
"""

from __future__ import annotations

import json

import anthropic
from course.blocks import tool_uses
from course.config import MODEL, create_client

REQUEST = "What is 90 minutes after 2026-09-09T13:36:00Z?"

# The Academy shape: a description, an open schema, no constraint.
LOOSE_TOOL = {
    "name": "add_duration_to_datetime",
    "description": "Adds time to a datetime",
    "input_schema": {
        "type": "object",
        "properties": {
            "datetime": {"type": "string"},
            "amount": {"type": "number"},
            "unit": {"type": "string"},
        },
    },
}

# The 2026 shape. `strict` turns the schema into a generation constraint, and
# the description carries the behavioural rule the schema cannot express.
STRICT_TOOL = {
    "name": "add_duration_to_datetime",
    "description": (
        "Shift an ISO 8601 UTC datetime by a signed amount. Use a negative "
        "amount to go backwards. Never guess the base datetime - it must come "
        "from get_current_datetime or from the user."
    ),
    "strict": True,
    "input_schema": {
        "type": "object",
        "properties": {
            "datetime": {
                "type": "string",
                "description": "ISO 8601 UTC instant, e.g. 2026-09-09T13:00:00Z",
            },
            "amount": {"type": "number", "description": "May be negative."},
            "unit": {
                "type": "string",
                "enum": ["minutes", "hours", "days", "weeks"],
            },
        },
        "required": ["datetime", "amount", "unit"],
        "additionalProperties": False,
    },
}


def call(client, tool: dict, label: str) -> None:  # noqa: ANN001
    response = client.messages.create(
        model=MODEL,
        max_tokens=500,
        tools=[tool],
        messages=[{"role": "user", "content": REQUEST}],
    )
    calls = tool_uses(response)
    print(f"--- {label} ---")
    if not calls:
        print("  (no tool call)")
    for tool_call in calls:
        print(f"  {tool_call.name}({json.dumps(tool_call.input)})")
    print()


def main() -> None:
    client = create_client()

    call(client, LOOSE_TOOL, "loose schema - the arguments are a hope")
    call(client, STRICT_TOOL, "strict schema - the arguments are guaranteed")

    print("--- error 1: strict without additionalProperties: false ---")
    broken = {
        **STRICT_TOOL,
        "input_schema": {
            **STRICT_TOOL["input_schema"],
            "additionalProperties": True,
        },
    }
    try:
        client.messages.create(
            model=MODEL,
            max_tokens=200,
            tools=[broken],
            messages=[{"role": "user", "content": REQUEST}],
        )
        print("  (accepted - check the current strict requirements)")
    except anthropic.BadRequestError as error:
        print(f"  400: {error.message}")

    print("\n--- error 2: strict on tool_choice instead of the tool ---")
    try:
        client.messages.create(
            model=MODEL,
            max_tokens=200,
            tools=[{k: v for k, v in STRICT_TOOL.items() if k != "strict"}],
            # `strict` belongs on the TOOL, never here. This is the most common
            # mistake when adopting it.
            tool_choice={
                "type": "tool",
                "name": "add_duration_to_datetime",
                "strict": True,
            },
            messages=[{"role": "user", "content": REQUEST}],
        )
        print("  (accepted - the field was ignored)")
    except anthropic.BadRequestError as error:
        print(f"  400: {error.message}")
    except TypeError as error:
        print(f"  TypeError from the SDK before sending: {error}")

    print(
        "\nstrict constrains the SHAPE. It does not check that values are sensible\n"
        "and it does not authorise anything - keep the validation from lesson 22."
    )


if __name__ == "__main__":
    main()
