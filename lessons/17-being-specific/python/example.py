"""Lesson 17 - Being specific.

One extraction task, three levels of specificity. Structured outputs removed a
whole category of prompt fiddling; what is left is judgement, ordering and edge
cases - and those still have to be said.

    uv run lesson 17
"""

from __future__ import annotations

import json
import re

from course.blocks import text_of
from course.config import FAST_MODEL, create_client

NOTE = """Standup, Tues 3 March 2026.
Ravi will ship the migration script - end of this week hopefully.
Someone needs to chase the vendor about the SSO cert, it expires the 19th.
Mei is on the flaky upload test, no date yet.
We agreed to revisit pricing at some point. Nobody owns that."""

LOOSE = "Extract the action items from this meeting note."

SPECIFIC = """Extract action items from this meeting note.

Return a JSON array. Each item has exactly:
  task      string, imperative, at most 12 words
  owner     string, or null if the note does not name a person
  due_date  string in YYYY-MM-DD, or null if no date is stated

Rules:
- The meeting is on 2026-03-03. Resolve relative dates against that.
- "end of this week" means the coming Friday.
- Never invent an owner or a date. Use null.
- Do not include items with no task.

Output only the JSON array."""

ITEM_SCHEMA = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "task": {"type": "string"},
                    "owner": {"type": ["string", "null"]},
                    "due_date": {"type": ["string", "null"]},
                },
                "required": ["task", "owner", "due_date"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["items"],
    "additionalProperties": False,
}

ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def check(label: str, items: list[dict] | None, raw: str) -> None:
    print(f"--- {label} ---")
    if items is None:
        print("did not parse as a JSON array of objects:")
        print(f"  {raw.strip()[:200]}")
        print("  FAIL  shape        unusable downstream\n")
        return

    print(json.dumps(items, indent=2))
    keys_ok = all({"task", "owner", "due_date"} <= set(item) for item in items)
    dates_ok = all(
        item.get("due_date") is None or ISO.match(str(item.get("due_date")))
        for item in items
    )
    # "Nobody owns that" - the note names no person, so owner must be null.
    placeholders = {"someone", "nobody", "we"}
    invented = [
        item["task"]
        for item in items
        if item.get("owner") and str(item["owner"]).lower() in placeholders
    ]
    print()
    print(f"  {'PASS' if keys_ok else 'FAIL'}  required keys")
    print(f"  {'PASS' if dates_ok else 'FAIL'}  ISO-8601 dates")
    print(f"  {'PASS' if not invented else 'FAIL'}  no placeholder owners  {invented}")
    print()


def try_parse(raw: str) -> list[dict] | None:
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if isinstance(value, dict) and isinstance(value.get("items"), list):
        return value["items"]
    return value if isinstance(value, list) else None


def main() -> None:
    client = create_client()

    for label, prompt in (("loose", LOOSE), ("specific", SPECIFIC)):
        response = client.messages.create(
            model=FAST_MODEL,
            max_tokens=800,
            messages=[
                {"role": "user", "content": f"{prompt}\n\n<note>\n{NOTE}\n</note>"}
            ],
        )
        raw = text_of(response)
        check(label, try_parse(raw), raw)

    response = client.messages.create(
        model=FAST_MODEL,
        max_tokens=800,
        messages=[
            {"role": "user", "content": f"{SPECIFIC}\n\n<note>\n{NOTE}\n</note>"}
        ],
        output_config={"format": {"type": "json_schema", "schema": ITEM_SCHEMA}},
    )
    raw = text_of(response)
    check("specific + schema", try_parse(raw), raw)

    print(
        "The loose prompt usually produces something sensible with a shape that\n"
        "changes between runs. Specificity fixes the semantics (null owners,\n"
        "resolved dates); the schema fixes the shape."
    )


if __name__ == "__main__":
    main()
