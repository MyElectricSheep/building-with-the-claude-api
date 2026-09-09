"""Lesson 67 - Workflows vs agents.

Two halves: a decision function you can run over real tasks, and a measured
comparison of the same job done both ways.

    uv run lesson 67
    uv run lesson 67 -- --decide-only
"""

from __future__ import annotations

import argparse
import json
import time
from typing import Any

from course.blocks import append_assistant_turn, text_of, tool_uses
from course.config import FAST_MODEL, REPO_ROOT, create_client
from course.graders import within_word_count
from course.tiers import TaskShape, recommend_tier

NOTES = (REPO_ROOT / "assets" / "data" / "incident.md").read_text(encoding="utf-8")

TASKS: list[tuple[str, TaskShape]] = [
    (
        "Classify a support email into one of five categories",
        TaskShape(True, False, True, True, True, False),
    ),
    (
        "Draft an incident retrospective from raw notes, then check it",
        TaskShape(True, True, True, True, True, False),
    ),
    (
        "Route a message, then answer it with the right tools",
        TaskShape(True, True, True, True, True, False),
    ),
    (
        "Debug a failing test in an unfamiliar repo",
        TaskShape(False, True, True, True, True, False),
    ),
    (
        "Investigate a production incident across logs, metrics and traces overnight",
        TaskShape(False, True, True, True, True, True),
    ),
    (
        "Reword a marketing headline more punchily",
        TaskShape(False, True, False, True, True, False),
    ),
    (
        "Autonomously reconcile and post month-end journal entries",
        TaskShape(False, True, True, True, False, False),
    ),
    (
        "Diagnose a rare hardware fault from sensor traces (never evaluated)",
        TaskShape(False, True, True, False, True, False),
    ),
]

SUMMARY_TOOLS: list[dict[str, Any]] = [
    {
        "name": "read_notes",
        "description": "Return the raw incident notes.",
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": False,
        },
    },
    {
        "name": "check_draft",
        "description": (
            "Check a draft retrospective: returns whether it is within 120-400 "
            "words. Call this before finishing."
        ),
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {"draft": {"type": "string"}},
            "required": ["draft"],
            "additionalProperties": False,
        },
    },
]

WRITE_SYSTEM = (
    "Write a blameless incident retrospective. 120-400 words. Be specific about "
    "times and causes."
)


def decide() -> None:
    print("=== the decision, as a function ===\n")
    width = max(len(task) for task, _ in TASKS)
    for task, shape in TASKS:
        result = recommend_tier(shape)
        failed = f"  (failed: {', '.join(result.failed)})" if result.failed else ""
        print(f"{task:<{width}}  ->  {result.tier}{failed}")
        print(f"{'':<{width}}      {result.reason}\n")


def as_workflow(client) -> tuple[str, int, int, float]:  # noqa: ANN001
    """The sequence is known, so just do it: write, then check, then revise once."""
    started = time.monotonic()
    tokens = 0

    response = client.messages.create(
        model=FAST_MODEL,
        max_tokens=1200,
        system=WRITE_SYSTEM,
        messages=[{"role": "user", "content": f"<notes>\n{NOTES}\n</notes>"}],
    )
    tokens += response.usage.input_tokens + response.usage.output_tokens
    draft = text_of(response).strip()
    turns = 1

    gate = within_word_count(120, 400)(draft)
    if gate.score < 1:
        response = client.messages.create(
            model=FAST_MODEL,
            max_tokens=1200,
            system=WRITE_SYSTEM,
            messages=[
                {"role": "user", "content": f"<notes>\n{NOTES}\n</notes>"},
                {"role": "assistant", "content": draft},
                {"role": "user", "content": f"Revise: {gate.reason}."},
            ],
        )
        tokens += response.usage.input_tokens + response.usage.output_tokens
        draft = text_of(response).strip()
        turns += 1

    return draft, tokens, turns, time.monotonic() - started


def as_agent(client) -> tuple[str, int, int, float]:  # noqa: ANN001
    """The same job, with the sequence left to the model."""
    started = time.monotonic()
    tokens = 0
    turns = 0
    messages: list[dict[str, Any]] = [
        {
            "role": "user",
            "content": (
                "Write a blameless incident retrospective from the notes. Use the "
                "tools. Check the draft before you finish."
            ),
        }
    ]

    draft = ""
    for _ in range(10):
        turns += 1
        response = client.messages.create(
            model=FAST_MODEL,
            max_tokens=1500,
            system=WRITE_SYSTEM,
            tools=SUMMARY_TOOLS,
            messages=messages,
        )
        tokens += response.usage.input_tokens + response.usage.output_tokens
        append_assistant_turn(messages, response)

        calls = tool_uses(response)
        if not calls:
            draft = text_of(response).strip() or draft
            break

        results = []
        for call in calls:
            if call.name == "read_notes":
                content = NOTES
            else:
                draft = str(call.input.get("draft", "")).strip()
                gate = within_word_count(120, 400)(draft)
                content = json.dumps({"ok": gate.score >= 1, "detail": gate.reason})
            results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": call.id,
                    "content": content,
                }
            )
        messages.append({"role": "user", "content": results})

    return draft, tokens, turns, time.monotonic() - started


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--decide-only", action="store_true")
    args = parser.parse_args()

    decide()
    if args.decide_only:
        print("--decide-only: skipping the measured comparison.")
        return

    client = create_client()
    print("=== the same job, both ways ===\n")

    workflow = as_workflow(client)
    agent = as_agent(client)

    header = f"{'':<12}{'tokens':>8}{'turns':>7}{'seconds':>9}{'passes gate':>13}"
    print(header)
    print("-" * len(header))
    for label, (draft, tokens, turns, seconds) in (
        ("workflow", workflow),
        ("agent", agent),
    ):
        passes = within_word_count(120, 400)(draft).score >= 1
        print(f"{label:<12}{tokens:>8}{turns:>7}{seconds:>9.1f}{str(passes):>13}")

    print(
        "\nThe agent usually gets there. The numbers answer a different question:\n"
        "what it cost to get there the flexible way, on a task whose sequence was\n"
        "knowable all along.\n\n"
        "Agents got much easier to build - tool runner, Agent SDK, Managed Agents.\n"
        "That is exactly why the discipline matters more: the cost of building one\n"
        "used to be the filter, and now judgement has to be."
    )


if __name__ == "__main__":
    main()
