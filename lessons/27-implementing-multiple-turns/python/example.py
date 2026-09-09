"""Lesson 27 - Implementing multiple turns.

The same request, twice: once through the hand-written loop, once through the
SDK tool runner. Read the manual loop; use the runner.

    uv run lesson 27
    uv run lesson 27 -- --manual
    uv run lesson 27 -- --runner
"""

from __future__ import annotations

import json
import sys
from typing import Any

from anthropic import beta_tool
from course.blocks import append_assistant_turn, text_of, tool_uses
from course.config import MODEL, create_client
from course.tools import (
    TOOL_DEFINITIONS,
    ReminderStore,
    add_duration_to_datetime,
    execute_tool,
    get_current_datetime,
)

REQUEST = "Remind me to renew the SSO certificate a week from now."
MAX_TURNS = 8

# --------------------------------------------------------------------------
# 1. The manual loop. This is the protocol.
# --------------------------------------------------------------------------


def manual_loop(client) -> str:  # noqa: ANN001
    store = ReminderStore()
    messages: list[dict[str, Any]] = [{"role": "user", "content": REQUEST}]

    # A bounded loop. `while True` around a paid API call is a bug waiting for
    # a model that keeps calling tools.
    for turn in range(1, MAX_TURNS + 1):
        response = client.messages.create(
            model=MODEL, max_tokens=1500, tools=TOOL_DEFINITIONS, messages=messages
        )

        # A long-running SERVER tool can pause the turn. Append and re-send.
        if response.stop_reason == "pause_turn":
            print(f"  turn {turn}: pause_turn - resuming")
            append_assistant_turn(messages, response)
            continue

        append_assistant_turn(messages, response)
        calls = tool_uses(response)
        if not calls:
            print(f"  turn {turn}: end_turn")
            return text_of(response)

        results = []
        for call in calls:
            print(f"  turn {turn}: {call.name}({json.dumps(call.input)})")
            try:
                value = execute_tool(call.name, call.input, store)
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": call.id,
                        "content": json.dumps(value),
                    }
                )
            except Exception as error:  # noqa: BLE001
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": call.id,
                        "content": str(error),
                        "is_error": True,
                    }
                )
        messages.append({"role": "user", "content": results})

    raise RuntimeError(f"tool loop did not finish within {MAX_TURNS} turns")


# --------------------------------------------------------------------------
# 2. The tool runner. Same protocol, the SDK drives it.
#    @beta_tool derives the schema from the signature and the docstring.
# --------------------------------------------------------------------------

RUNNER_STORE = ReminderStore()


@beta_tool
def current_datetime() -> str:
    """Return the current date and time in UTC, ISO 8601.

    Call this before any relative date arithmetic - never guess the time.
    """
    return get_current_datetime()


@beta_tool
def shift_datetime(datetime: str, amount: float, unit: str) -> str:
    """Shift an ISO 8601 UTC datetime by a signed amount.

    Args:
        datetime: ISO 8601 UTC instant, e.g. 2026-09-09T13:00:00Z.
        amount: May be negative to go backwards.
        unit: One of minutes, hours, days, weeks.
    """
    return add_duration_to_datetime(datetime, amount, unit)


@beta_tool
def create_reminder(text: str, remind_at: str) -> str:
    """Create a reminder at a known UTC instant.

    Args:
        text: What to remind the user about.
        remind_at: ISO 8601 UTC instant.
    """
    reminder = RUNNER_STORE.set_reminder(text, remind_at)
    return json.dumps({"id": reminder.id, "remindAt": reminder.remind_at})


def runner_loop(client) -> str:  # noqa: ANN001
    runner = client.beta.messages.tool_runner(
        model=MODEL,
        max_tokens=1500,
        tools=[current_datetime, shift_datetime, create_reminder],
        messages=[{"role": "user", "content": REQUEST}],
        max_iterations=MAX_TURNS,
    )

    last = None
    for index, message in enumerate(runner, start=1):
        names = [block.name for block in message.content if block.type == "tool_use"]
        print(f"  turn {index}: {message.stop_reason} {names}")
        last = message

    if last is None:
        raise RuntimeError("the runner produced no messages")
    # The runner does NOT auto-resume pause_turn: it exits and hands you a
    # silently truncated answer. Always check.
    if last.stop_reason == "pause_turn":
        raise RuntimeError("runner stopped on pause_turn - resume it manually")
    return "".join(block.text for block in last.content if block.type == "text")


def main() -> None:
    client = create_client()
    only_manual = "--manual" in sys.argv
    only_runner = "--runner" in sys.argv

    if not only_runner:
        print("=== manual loop ===")
        print(f"\n{manual_loop(client)}\n")

    if not only_manual:
        print("=== tool runner ===")
        print(f"\n{runner_loop(client)}")
        print(f"\nreminders created by the runner: {RUNNER_STORE.list()}")


if __name__ == "__main__":
    main()
