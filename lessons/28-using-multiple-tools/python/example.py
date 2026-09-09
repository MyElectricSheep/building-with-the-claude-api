"""Lesson 28 - Using multiple tools, and the parallelism the Academy predates.

Three independent lookups in one turn. Execute them concurrently, return every
result in ONE user message, then compare with disable_parallel_tool_use.

    uv run lesson 28
"""

from __future__ import annotations

import json
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from course.blocks import append_assistant_turn, text_of, tool_uses
from course.cities import CITY_TOOL, lookup_city
from course.config import MODEL, create_client

REQUEST = (
    "Compare Lisbon, Reykjavik and Noumea: give the timezone and population of "
    "each, then say which is largest."
)


def run_call(call) -> dict[str, Any]:  # noqa: ANN001
    """Execute one tool_use block. Errors become is_error results, never drops."""
    try:
        value = lookup_city(str(call.input["city"]))
        return {
            "type": "tool_result",
            "tool_use_id": call.id,
            "content": json.dumps(value),
        }
    except Exception as error:  # noqa: BLE001
        return {
            "type": "tool_result",
            "tool_use_id": call.id,
            "content": str(error),
            "is_error": True,
        }


def conversation(client, *, parallel: bool) -> tuple[int, int, str]:  # noqa: ANN001
    """Returns (turns, max calls seen in one turn, final answer)."""
    messages: list[dict[str, Any]] = [{"role": "user", "content": REQUEST}]
    turns = 0
    widest = 0

    for attempt in range(10):
        turns = attempt + 1
        kwargs: dict[str, Any] = {}
        if not parallel:
            kwargs["tool_choice"] = {"type": "auto", "disable_parallel_tool_use": True}

        response = client.messages.create(
            model=MODEL,
            max_tokens=1500,
            tools=[CITY_TOOL],
            messages=messages,
            **kwargs,
        )
        append_assistant_turn(messages, response)

        calls = tool_uses(response)
        if not calls:
            return turns, widest, text_of(response)

        widest = max(widest, len(calls))
        names = ", ".join(str(call.input.get("city")) for call in calls)
        print(
            f"  turn {turns}: {len(calls)} tool call(s) in ONE assistant turn: "
            f"{names}"
        )

        # They are independent - that is why the model batched them. Run them
        # concurrently.
        with ThreadPoolExecutor(max_workers=len(calls)) as pool:
            results = list(pool.map(run_call, calls))

        # ALL results in ONE user message. Splitting them across several
        # messages trains the model to stop batching.
        messages.append({"role": "user", "content": results})

    raise RuntimeError("turn limit reached")


def main() -> None:
    client = create_client()

    print("=== parallel tool calls (the default) ===")
    turns, widest, answer = conversation(client, parallel=True)
    print(f"\n{answer}\n")
    print(f"turns: {turns} | most calls in a single turn: {widest}\n")

    print("=== disable_parallel_tool_use: true ===")
    serial_turns, serial_widest, _ = conversation(client, parallel=False)
    print(f"\nturns: {serial_turns} | most calls in a single turn: {serial_widest}")

    print(
        "\nParallel calls cost fewer round trips for the same work. Beyond a few\n"
        "dozen tools, look at tool search (defer_loading); for tool-heavy chains,\n"
        "look at programmatic tool calling. Both are in the README."
    )


if __name__ == "__main__":
    main()
