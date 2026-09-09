"""Lesson 8 - Structured data with structured outputs.

Replaces the Academy's prefill + stop_sequences trick, which now returns a 400.

    uv run lesson 08
"""

from __future__ import annotations

import json

from course.blocks import parse_structured
from course.config import MODEL, create_client
from pydantic import BaseModel, Field

PROMPT = (
    "Generate a short AWS EventBridge rule that matches EC2 instance "
    "state-change notifications for terminated instances."
)

# Hand-written schema. Note `additionalProperties: false` on BOTH objects - the
# Academy's version left the nested `detail` object open, and structured outputs
# require it closed anyway.
EVENTBRIDGE_SCHEMA = {
    "type": "object",
    "properties": {
        "source": {"type": "array", "items": {"type": "string"}},
        "detail-type": {"type": "array", "items": {"type": "string"}},
        "detail": {
            "type": "object",
            "properties": {"state": {"type": "array", "items": {"type": "string"}}},
            "required": ["state"],
            "additionalProperties": False,
        },
    },
    "required": ["source", "detail-type", "detail"],
    "additionalProperties": False,
}


class Detail(BaseModel):
    state: list[str]


class EventBridgeRule(BaseModel):
    """The same shape, expressed as a typed model."""

    source: list[str]
    detail_type: list[str] = Field(alias="detail-type")
    detail: Detail


def raw_schema_path(client) -> None:  # noqa: ANN001
    print("--- output_config.format with a raw JSON Schema ---")
    response = client.messages.create(
        model=MODEL,
        max_tokens=1000,
        messages=[{"role": "user", "content": PROMPT}],
        output_config={"format": {"type": "json_schema", "schema": EVENTBRIDGE_SCHEMA}},
    )
    # parse_structured checks stop_reason first: a refusal or a max_tokens
    # truncation produces text that will not parse.
    rule = parse_structured(response)
    print(json.dumps(rule, indent=2))


def typed_path(client) -> None:  # noqa: ANN001
    print("\n--- messages.parse with a Pydantic model ---")
    response = client.messages.parse(
        model=MODEL,
        max_tokens=1000,
        messages=[{"role": "user", "content": PROMPT}],
        output_format=EventBridgeRule,
    )
    rule = response.parsed_output
    if rule is None:
        print(f"parsed_output was None (stop_reason: {response.stop_reason})")
        return
    print(f"source:      {rule.source}")
    print(f"detail-type: {rule.detail_type}")
    print(f"states:      {rule.detail.state}")
    print("\nThe model could not have returned a non-conforming shape: this is")
    print("constrained decoding, not a prompt politely asking for JSON.")


def main() -> None:
    client = create_client()
    raw_schema_path(client)
    typed_path(client)


if __name__ == "__main__":
    main()
