"""Lesson 11 - Generating test datasets.

Generate candidate cases with a cheap model under a JSON Schema, validate what
code can validate, and write them out marked unreviewed. Curation stays human.

No `temperature`, no assistant prefill - both are gone from the current API.

    uv run lesson 11
    uv run lesson 11 -- --count 8
"""

from __future__ import annotations

import argparse
import json

from course.blocks import parse_structured
from course.config import FAST_MODEL, REPO_ROOT, create_client
from course.dataset import validate_cases
from course.triage import CATEGORIES, URGENCIES

OUTPUT_PATH = REPO_ROOT / "assets" / "eval" / "generated.json"

GENERATION_SCHEMA = {
    "type": "object",
    "properties": {
        "cases": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "input": {"type": "string"},
                    "expected": {
                        "type": "object",
                        "properties": {
                            "category": {"type": "string", "enum": CATEGORIES},
                            "urgency": {"type": "string", "enum": URGENCIES},
                            "has_order_id": {"type": "boolean"},
                        },
                        "required": ["category", "urgency", "has_order_id"],
                        "additionalProperties": False,
                    },
                },
                "required": ["id", "input", "expected"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["cases"],
    "additionalProperties": False,
}

SYSTEM = """You write test cases for a customer-support triage classifier.

Each case is a realistic support email plus the labels a careful human would
assign. Vary length, tone, and how obvious the label is: include at least one
case that is genuinely ambiguous between two categories, and at least one where
the writer says something is urgent but it is not.

Use a short kebab-case id describing the email. Only include an order identifier
in the text when has_order_id is true."""


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=5)
    args = parser.parse_args()

    client = create_client()

    # Note the model: generate with a DIFFERENT model than the one under test
    # where you can. A model writing its own exam writes questions it can answer.
    response = client.messages.create(
        model=FAST_MODEL,
        max_tokens=2000,
        system=SYSTEM,
        messages=[
            {"role": "user", "content": f"Write {args.count} support-email test cases."}
        ],
        output_config={"format": {"type": "json_schema", "schema": GENERATION_SCHEMA}},
    )

    payload = parse_structured(response)
    accepted, issues = validate_cases(payload["cases"])

    print(f"generated {len(payload['cases'])} | accepted {len(accepted)}")
    for issue in issues:
        print(f"  rejected {issue.id}: {issue.problem}")

    OUTPUT_PATH.write_text(
        json.dumps(
            {
                "description": (
                    "Machine-generated candidate cases. Every case is "
                    "reviewed=false until a human has checked it."
                ),
                "generated_by": FAST_MODEL,
                "cases": accepted,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"\nwrote {OUTPUT_PATH.relative_to(REPO_ROOT)}")
    print(
        "Every case is marked reviewed=false. Lesson 12 refuses to score "
        "unreviewed cases - generated data is a candidate, not ground truth."
    )


if __name__ == "__main__":
    main()
