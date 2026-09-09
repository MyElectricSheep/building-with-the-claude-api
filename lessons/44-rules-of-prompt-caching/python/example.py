"""Lesson 44 - Rules of prompt caching.

Mostly a structural analysis: build four request shapes, predict which will
cache, then confirm the prediction against usage. Pass --offline to skip the API.

    uv run lesson 44
    uv run lesson 44 -- --offline
"""

from __future__ import annotations

import argparse
import datetime
import uuid

from course.cacheaudit import audit_prefix, likely_below_minimum
from course.config import MODEL, create_client
from course.corpus import load_corpus
from course.tools import TOOL_DEFINITIONS

QUESTION = "When does the on-call handover happen?"


def handbook() -> str:
    corpus = "\n\n".join(f"# {doc.name}\n{doc.text}" for doc in load_corpus())
    return (corpus + "\n\n") * 4


def shapes() -> dict[str, dict]:
    body = handbook()
    now = datetime.datetime.now(datetime.UTC).isoformat()
    return {
        "stable, large": {
            "system": f"Answer from the handbook.\n\n{body}",
            "tools": None,
        },
        "stable, too small": {
            "system": "Answer from the handbook.",
            "tools": None,
        },
        "timestamp in system": {
            "system": f"Current time: {now}\nAnswer from the handbook.\n\n{body}",
            "tools": None,
        },
        "uuid + unsorted tools": {
            "system": f"Trace {uuid.uuid4()}\nAnswer from the handbook.\n\n{body}",
            "tools": list(reversed(TOOL_DEFINITIONS)),
        },
    }


def analyse() -> dict[str, bool]:
    """Static prediction: which shapes should cache?"""
    predictions: dict[str, bool] = {}
    print("=== static analysis (no API calls) ===\n")
    for label, shape in shapes().items():
        findings = audit_prefix(
            tools=shape["tools"], system=shape["system"], stable_messages=[]
        )
        too_small = likely_below_minimum(shape["system"])
        will_cache = not findings and not too_small
        predictions[label] = will_cache

        print(f"{label}")
        print(f"  system ~{len(shape['system']) // 4} tokens (rough estimate)")
        if too_small:
            print("  [problem] below the minimum cacheable prefix (1024-4096 tokens)")
        for finding in findings:
            print(f"  [problem] {finding.where}: {finding.problem}")
        print(f"  -> predicted to cache: {will_cache}\n")
    return predictions


def confirm(predictions: dict[str, bool]) -> None:
    print("=== confirming against usage (2 requests per shape) ===\n")
    client = create_client()
    for label, shape in shapes().items():
        reads = 0
        for _ in range(2):
            kwargs = {"tools": shape["tools"]} if shape["tools"] else {}
            response = client.messages.create(
                model=MODEL,
                max_tokens=120,
                cache_control={"type": "ephemeral"},
                system=shape["system"],
                messages=[{"role": "user", "content": QUESTION}],
                **kwargs,
            )
            reads = response.usage.cache_read_input_tokens or 0
        cached = reads > 0
        mark = "as predicted" if cached == predictions[label] else "PREDICTION WRONG"
        print(f"  {label:<24} cache_read on request 2: {reads:>6}   {mark}")

    print(
        "\nExplicit block-level breakpoints were not removed - they are the tool\n"
        "for precise placement (a huge fixed document, a large static tool list,\n"
        "sections with different TTLs). Top-level cache_control is the default."
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args()

    predictions = analyse()
    if args.offline:
        print("--offline: skipping the confirmation requests.")
        return
    confirm(predictions)


if __name__ == "__main__":
    main()
