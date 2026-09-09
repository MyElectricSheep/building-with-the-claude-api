"""Lesson 62 - Parallelization.

Three specialists on the same input, then an aggregator. Run sequentially and
concurrently, with wall-clock for each, so the latency claim is measured.

    uv run lesson 62
"""

from __future__ import annotations

import json
import time

from course.blocks import parse_structured, text_of
from course.config import FAST_MODEL, REPO_ROOT, create_client
from course.evals import map_with_concurrency

NOTES = (REPO_ROOT / "assets" / "data" / "incident.md").read_text(encoding="utf-8")

FINDING_SCHEMA = {
    "type": "object",
    "properties": {
        "findings": {"type": "array", "items": {"type": "string"}},
        "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
    },
    "required": ["findings", "confidence"],
    "additionalProperties": False,
}

# Each specialist gets a focused prompt and a clean context. That is the half of
# this pattern that is about QUALITY rather than latency.
SPECIALISTS = {
    "timeline": (
        "You extract incident timelines. List each significant event as "
        "'HH:MM - what happened'. Detection, declaration, mitigation, "
        "resolution. Nothing else."
    ),
    "detection": (
        "You analyse why an incident was not caught earlier. Focus on "
        "monitoring, canaries and tests. Each finding names the specific "
        "mechanism that failed and why."
    ),
    "process": (
        "You analyse incident process and communications: roles, decisions, "
        "who was informed. Blameless - describe what made the mistake easy to "
        "make, never who made it."
    ),
}


def run_specialist(client, name: str) -> tuple[str, dict]:  # noqa: ANN001
    response = client.messages.create(
        model=FAST_MODEL,
        max_tokens=800,
        system=SPECIALISTS[name],
        messages=[{"role": "user", "content": f"<notes>\n{NOTES}\n</notes>"}],
        output_config={"format": {"type": "json_schema", "schema": FINDING_SCHEMA}},
    )
    return name, parse_structured(response)


def aggregate(client, results: dict[str, dict]) -> str:  # noqa: ANN001
    # The aggregator merges DATA, not prose - that is what the structured
    # specialist output buys you.
    response = client.messages.create(
        model=FAST_MODEL,
        max_tokens=1200,
        system=(
            "You merge specialist findings into one blameless incident "
            "retrospective. Do not add facts the specialists did not report. "
            "Under 300 words."
        ),
        messages=[{"role": "user", "content": json.dumps(results)}],
    )
    return text_of(response).strip()


def main() -> None:
    client = create_client()
    names = list(SPECIALISTS)

    print(f"{len(names)} specialists on the same input, model {FAST_MODEL}\n")

    print("--- sequential ---")
    started = time.monotonic()
    sequential = dict(run_specialist(client, name) for name in names)
    sequential_ms = (time.monotonic() - started) * 1000
    for name, result in sequential.items():
        print(f"  {name:<10} {len(result['findings'])} findings, "
              f"confidence {result['confidence']}")
    print(f"  wall clock: {sequential_ms:.0f} ms\n")

    print("--- concurrent ---")
    started = time.monotonic()
    concurrent = dict(
        map_with_concurrency(names, 3, lambda name: run_specialist(client, name))
    )
    concurrent_ms = (time.monotonic() - started) * 1000
    for name, result in concurrent.items():
        print(f"  {name:<10} {len(result['findings'])} findings, "
              f"confidence {result['confidence']}")
    print(f"  wall clock: {concurrent_ms:.0f} ms")
    speedup = sequential_ms / concurrent_ms if concurrent_ms else 0
    print(f"  speedup:    {speedup:.1f}x\n")

    print("--- aggregated ---\n")
    print(aggregate(client, concurrent))

    print(
        "\nLatency is only half the argument. The other half is that each\n"
        "specialist got a focused prompt and a clean context, instead of one\n"
        "prompt trying to do three jobs - and that holds even when you run them\n"
        "sequentially.\n\n"
        "This is layer A: parallel REQUESTS. Layer B is parallel tool calls\n"
        "inside one turn (lesson 28); layer C is context-isolated parallel\n"
        "agents on Managed Agents."
    )


if __name__ == "__main__":
    main()
