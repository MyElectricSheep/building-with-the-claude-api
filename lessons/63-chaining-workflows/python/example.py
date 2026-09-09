"""Lesson 63 - Chaining, with real gates between the stages.

The reason chaining beats one big prompt is not focus - it is that you can put
CODE between the stages. A gate failing stops the chain and says which one.

    uv run lesson 63
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from course.blocks import parse_structured, text_of
from course.config import FAST_MODEL, MODEL, REPO_ROOT, create_client
from course.graders import avoids_phrases, within_word_count

NOTES = (REPO_ROOT / "assets" / "data" / "incident.md").read_text(encoding="utf-8")
TIME = re.compile(r"^\d{2}:\d{2}$")


@dataclass
class GateResult:
    ok: bool
    reason: str


FACTS_SCHEMA = {
    "type": "object",
    "properties": {
        "events": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "at": {"type": "string"},
                    "what": {"type": "string"},
                },
                "required": ["at", "what"],
                "additionalProperties": False,
            },
        },
        "service": {"type": "string"},
    },
    "required": ["events", "service"],
    "additionalProperties": False,
}

SEVERITY_SCHEMA = {
    "type": "object",
    "properties": {
        "severity": {"type": "string", "enum": ["SEV1", "SEV2", "SEV3"]},
        "reason": {"type": "string"},
    },
    "required": ["severity", "reason"],
    "additionalProperties": False,
}

ACTIONS_SCHEMA = {
    "type": "object",
    "properties": {
        "actions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "action": {"type": "string"},
                    "owner_role": {"type": "string"},
                },
                "required": ["action", "owner_role"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["actions"],
    "additionalProperties": False,
}


def gate_facts(facts: dict[str, Any]) -> GateResult:
    """Every timestamp must be HH:MM. A schema cannot express that."""
    bad = [event["at"] for event in facts["events"] if not TIME.match(event["at"])]
    if bad:
        return GateResult(False, f"timestamps not in HH:MM: {bad}")
    if len(facts["events"]) < 4:
        return GateResult(False, f"only {len(facts['events'])} events extracted")
    return GateResult(True, f"{len(facts['events'])} events, all HH:MM")


def gate_severity(verdict: dict[str, Any]) -> GateResult:
    """A SEV1 must be justified - business rule, not a schema rule."""
    if verdict["severity"] == "SEV1" and len(verdict["reason"].split()) < 5:
        return GateResult(False, "SEV1 declared without a stated reason")
    return GateResult(True, f"{verdict['severity']}: {verdict['reason'][:60]}")


def gate_draft(draft: str) -> GateResult:
    length = within_word_count(120, 400)(draft)
    if length.score < 1:
        return GateResult(False, length.reason)
    filler = avoids_phrases(["as an AI", "lessons learned", "moving forward"])(draft)
    if filler.score < 1:
        return GateResult(False, filler.reason)
    return GateResult(True, length.reason)


def gate_actions(payload: dict[str, Any]) -> GateResult:
    actions = payload["actions"]
    if len(actions) < 2:
        return GateResult(False, f"only {len(actions)} action(s)")
    unowned = [a["action"] for a in actions if not a["owner_role"].strip()]
    if unowned:
        return GateResult(False, f"actions with no owner role: {unowned}")
    return GateResult(True, f"{len(actions)} actions, all owned")


def main() -> None:
    client = create_client()

    def stage(number: int, name: str, gate: GateResult) -> bool:
        mark = "ok  " if gate.ok else "STOP"
        print(f"  [{mark}] stage {number} {name:<18} {gate.reason}")
        return gate.ok

    print(f"four-stage chain, gates between every stage (model {FAST_MODEL})\n")

    # Stage 1: extract.
    response = client.messages.create(
        model=FAST_MODEL,
        max_tokens=1200,
        system="Extract the incident timeline. Times exactly as written, HH:MM.",
        messages=[{"role": "user", "content": f"<notes>\n{NOTES}\n</notes>"}],
        output_config={"format": {"type": "json_schema", "schema": FACTS_SCHEMA}},
    )
    facts = parse_structured(response)
    if not stage(1, "extract facts", gate_facts(facts)):
        return

    # Stage 2: classify. Input is the PREVIOUS STAGE'S DATA, not the raw notes.
    response = client.messages.create(
        model=FAST_MODEL,
        max_tokens=400,
        system=(
            "Assign a severity. SEV1: unusable or money at risk. SEV2: a major "
            "feature broken. SEV3: degraded but usable. Justify it in one "
            "sentence naming the evidence."
        ),
        messages=[{"role": "user", "content": json.dumps(facts)}],
        output_config={"format": {"type": "json_schema", "schema": SEVERITY_SCHEMA}},
    )
    verdict = parse_structured(response)
    if not stage(2, "classify severity", gate_severity(verdict)):
        return

    # Stage 3: draft.
    response = client.messages.create(
        model=FAST_MODEL,
        max_tokens=1200,
        system=(
            "Write a blameless retrospective from these facts. 120-400 words. "
            "No filler phrases, no 'lessons learned' heading."
        ),
        messages=[
            {
                "role": "user",
                "content": json.dumps({"facts": facts, "severity": verdict}),
            }
        ],
    )
    draft = text_of(response).strip()
    if not stage(3, "draft retro", gate_draft(draft)):
        return

    # Stage 4: actions. The one stage worth the stronger model.
    response = client.messages.create(
        model=MODEL,
        max_tokens=800,
        system=(
            "Propose specific follow-up actions. Each names a role that owns it. "
            "No action may be 'improve monitoring' or similar - be concrete."
        ),
        messages=[{"role": "user", "content": draft}],
        output_config={"format": {"type": "json_schema", "schema": ACTIONS_SCHEMA}},
    )
    payload = parse_structured(response)
    if not stage(4, "propose actions", gate_actions(payload)):
        return

    print("\n=== retrospective ===\n")
    print(draft)
    print("\n=== actions ===")
    for action in payload["actions"]:
        print(f"  [{action['owner_role']}] {action['action']}")

    print(
        "\nThe gates are the point. A single prompt cannot refuse to continue,\n"
        "and it cannot apply a business rule that no schema can express.\n\n"
        "For a chain of TOOL calls specifically, programmatic tool calling can\n"
        "collapse the round trips inside one turn - see the README. It does not\n"
        "replace this."
    )


if __name__ == "__main__":
    main()
