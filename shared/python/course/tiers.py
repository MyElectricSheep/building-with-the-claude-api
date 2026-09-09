"""The workflow-vs-agent decision, as a function (lesson 67).

Pure and unit tested. The point is that "should this be an agent?" has an answer
you can defend, not a vibe - and that the answer is usually "no".
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Tier = Literal["single-call", "workflow", "agent", "hosted-agent"]


@dataclass(frozen=True)
class TaskShape:
    #: Can you write the steps down in advance?
    steps_are_knowable: bool
    #: Does it need more than one model call at all?
    needs_multiple_steps: bool
    #: Does the outcome justify 5-20x the tokens and latency of a workflow?
    outcome_justifies_cost: bool
    #: Have you MEASURED that the model can do this task? (lessons 9-15)
    measured_viable: bool
    #: Can a mistake be caught and undone?
    errors_are_recoverable: bool
    #: Long-running, scheduled, or needing a hosted sandbox?
    needs_hosted_runtime: bool


@dataclass(frozen=True)
class Recommendation:
    tier: Tier
    reason: str
    #: Checks that failed, in the order they were evaluated.
    failed: list[str]


_WHY = {
    "value": "the outcome does not justify an agent's cost and latency",
    "viability": "you have not measured that the model can do this task",
    "cost of error": "a mistake would not be catchable or reversible",
}


def recommend_tier(shape: TaskShape) -> Recommendation:
    if not shape.needs_multiple_steps:
        return Recommendation(
            "single-call",
            "One model call answers it. Anything more is machinery you own for free.",
            [],
        )

    if shape.steps_are_knowable:
        return Recommendation(
            "workflow",
            "The sequence is knowable, so it is testable, predictable and cheaper. "
            "Chain, route, parallelize, or evaluate-and-optimize.",
            [],
        )

    # From here the sequence is genuinely unknown - an agent is on the table.
    # Every remaining check is a reason to drop back down anyway.
    failed: list[str] = []
    if not shape.outcome_justifies_cost:
        failed.append("value")
    if not shape.measured_viable:
        failed.append("viability")
    if not shape.errors_are_recoverable:
        failed.append("cost of error")

    if failed:
        return Recommendation(
            "workflow",
            "The sequence is unknown, but "
            + "; ".join(_WHY[name] for name in failed)
            + ". Constrain it into a workflow, even an imperfect one.",
            failed,
        )

    if shape.needs_hosted_runtime:
        return Recommendation(
            "hosted-agent",
            "All four checks pass, and it is long-running, scheduled, or needs a "
            "hosted sandbox. Managed Agents supplies the loop and the deployment.",
            [],
        )

    return Recommendation(
        "agent",
        "All four checks pass and you can host it. A manual loop or the SDK tool "
        "runner, on your own infrastructure.",
        [],
    )
