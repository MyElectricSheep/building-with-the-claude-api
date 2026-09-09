"""Lesson 12 - Running the eval.

The Academy's run_prompt / run_test_case / run_eval decomposition is good. What
a 2026 runner adds: bounded concurrency, per-case error isolation, no hand-rolled
retries, and a refusal to score unreviewed data.

    uv run lesson 12
    uv run lesson 12 -- --concurrency 1 --include-unreviewed
"""

from __future__ import annotations

import argparse
import json

from course.config import FAST_MODEL, REPO_ROOT, create_client
from course.evals import EvalCase, format_report, run_eval
from course.graders import exact_fields
from course.triage import PROMPT_V2, load_cases, triage

GENERATED_PATH = REPO_ROOT / "assets" / "eval" / "generated.json"
GRADED_FIELDS = ["category", "urgency", "has_order_id"]


def load_generated(include_unreviewed: bool) -> list[EvalCase]:
    """Generated cases are candidates. Unreviewed ones are not a benchmark."""
    if not GENERATED_PATH.exists():
        return []
    payload = json.loads(GENERATED_PATH.read_text(encoding="utf-8"))
    cases, skipped = [], 0
    for case in payload.get("cases", []):
        if not case.get("reviewed") and not include_unreviewed:
            skipped += 1
            continue
        cases.append(
            EvalCase(
                id=f"gen:{case['id']}",
                input=case["input"],
                expected=case["expected"],
            )
        )
    if skipped:
        print(
            f"skipping {skipped} unreviewed generated case(s) "
            "(pass --include-unreviewed to score them anyway)"
        )
    return cases


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--concurrency", type=int, default=3)
    parser.add_argument("--include-unreviewed", action="store_true")
    args = parser.parse_args()

    client = create_client()
    cases = load_cases() + load_generated(args.include_unreviewed)

    print(f"{len(cases)} cases | model {FAST_MODEL} | concurrency {args.concurrency}\n")

    # No retry loop here on purpose: the SDK already retries 408/409/429/5xx
    # with exponential backoff (max_retries, default 2).
    report = run_eval(
        cases=cases,
        run=lambda email: triage(client, FAST_MODEL, PROMPT_V2, email),
        graders={"fields": exact_fields(GRADED_FIELDS)},
        concurrency=args.concurrency,
    )

    print(format_report(report, ["fields"]))

    print("\ntimings (ms)")
    for result in report.results:
        print(f"  {result.id:<24} {result.duration_ms:>6}")

    if report.errored:
        print(
            f"\n{report.errored} case(s) errored. They are excluded from the mean: "
            "an errored case is not a failing case."
        )


if __name__ == "__main__":
    main()
