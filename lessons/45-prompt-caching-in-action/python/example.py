"""Lesson 45 - Prompt caching in action.

The reminder agent run three ways - no caching, automatic, explicit - with real
token costs. The interesting column is cache_read on iterations 2+: that is
where an agent gets its money back.

    uv run lesson 45
"""

from __future__ import annotations

import copy
import json
from dataclasses import dataclass
from typing import Any

from course.blocks import append_assistant_turn, tool_uses
from course.config import MODEL, create_client
from course.corpus import load_corpus
from course.tools import TOOL_DEFINITIONS, ReminderStore, execute_tool

REQUEST = "Remind me to renew the SSO certificate a week from now."


def big_system() -> str:
    """Large enough to clear the minimum cacheable prefix."""
    corpus = "\n\n".join(f"# {doc.name}\n{doc.text}" for doc in load_corpus())
    body = (corpus + "\n\n") * 4
    return (
        "You are an assistant for this company. Use the tools to schedule "
        f"reminders. Handbook for reference:\n\n<handbook>\n{body}</handbook>"
    )


@dataclass
class Cost:
    uncached: int = 0
    written: int = 0
    read: int = 0
    turns: int = 0

    def add(self, usage) -> None:  # noqa: ANN001
        self.uncached += usage.input_tokens
        self.written += usage.cache_creation_input_tokens or 0
        self.read += usage.cache_read_input_tokens or 0
        self.turns += 1

    @property
    def billed_equivalent(self) -> float:
        """Rough relative cost: writes ~1.25x, reads ~0.1x a normal input token."""
        return self.uncached + self.written * 1.25 + self.read * 0.1


def run_agent(client, label: str, **cache_kwargs) -> Cost:  # noqa: ANN001, ANN003
    store = ReminderStore()
    messages: list[dict[str, Any]] = [{"role": "user", "content": REQUEST}]
    cost = Cost()

    for _ in range(8):
        response = client.messages.create(
            model=MODEL,
            max_tokens=1200,
            system=cache_kwargs["system"],
            tools=cache_kwargs["tools"],
            messages=messages,
            **cache_kwargs["extra"],
        )
        cost.add(response.usage)
        append_assistant_turn(messages, response)

        calls = tool_uses(response)
        if not calls:
            break

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

    print(
        f"{label:<26} turns {cost.turns}  uncached {cost.uncached:>7}  "
        f"write {cost.written:>7}  read {cost.read:>7}  "
        f"~billed {cost.billed_equivalent:>9,.0f}"
    )
    return cost


def explicit_tools(ttl: str | None = None) -> list[dict[str, Any]]:
    """A breakpoint on the LAST tool caches the whole tool block.

    Render order is tools -> system -> messages, so this covers everything
    before it.
    """
    tools = copy.deepcopy(TOOL_DEFINITIONS)
    marker: dict[str, Any] = {"type": "ephemeral"}
    if ttl:
        marker["ttl"] = ttl
    tools[-1]["cache_control"] = marker
    return tools


def main() -> None:
    client = create_client()
    system_text = big_system()

    print("agent loop, same request, three caching strategies\n")

    run_agent(
        client,
        "1. no caching",
        system=system_text,
        tools=TOOL_DEFINITIONS,
        extra={},
    )
    run_agent(
        client,
        "2. automatic (top-level)",
        system=system_text,
        tools=TOOL_DEFINITIONS,
        extra={"cache_control": {"type": "ephemeral"}},
    )
    run_agent(
        client,
        "3. explicit breakpoints",
        system=[
            {
                "type": "text",
                "text": system_text,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        tools=explicit_tools(),
        extra={},
    )
    run_agent(
        client,
        "4. explicit, ttl=1h",
        system=[
            {
                "type": "text",
                "text": system_text,
                "cache_control": {"type": "ephemeral", "ttl": "1h"},
            }
        ],
        tools=explicit_tools("1h"),
        extra={},
    )

    print(
        "\n~billed is a rough relative figure: writes ~1.25x, reads ~0.1x a\n"
        "normal input token. Run 1 pays full price on every iteration. Runs 2-4\n"
        "pay a write once and reads afterwards - which is exactly the shape of\n"
        "an agent loop, where tools and system are identical every turn.\n\n"
        "A 1h TTL costs more to write, so it pays only if you get enough reads\n"
        "inside the hour to beat several 5-minute writes."
    )


if __name__ == "__main__":
    main()
