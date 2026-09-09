"""Lesson 10 - A typical eval workflow.

Same dataset, two prompt versions, one diff. The diff is the deliverable: a
mean score that goes up while an individual case regresses is the most common
way an eval misleads you.

    uv run lesson 10
"""

from __future__ import annotations

from course.config import FAST_MODEL, create_client
from course.evals import EvalReport, format_report, run_eval
from course.graders import exact_fields
from course.triage import PROMPT_V1, PROMPT_V2, load_cases, triage

GRADED_FIELDS = ["category", "urgency", "has_order_id"]


def score_of(report: EvalReport, case_id: str) -> float | None:
    for result in report.results:
        if result.id == case_id:
            return None if result.error else result.grades["fields"].score
    return None


def main() -> None:
    client = create_client()
    cases = load_cases()

    reports: dict[str, EvalReport] = {}
    for label, prompt in (("v1", PROMPT_V1), ("v2", PROMPT_V2)):
        print(f"=== prompt {label} ===")
        report = run_eval(
            cases=cases,
            run=lambda email, p=prompt: triage(client, FAST_MODEL, p, email),
            graders={"fields": exact_fields(GRADED_FIELDS)},
            concurrency=3,
        )
        reports[label] = report
        print(format_report(report, ["fields"]))
        print()

    print("=== per-case diff (v1 -> v2) ===")
    for case in cases:
        before = score_of(reports["v1"], case.id)
        after = score_of(reports["v2"], case.id)
        if before is None or after is None:
            marker = "?"
        elif after > before:
            marker = "FIXED"
        elif after < before:
            marker = "REGRESSED"
        else:
            marker = "same"
        print(f"  {case.id:<16} {before} -> {after}   {marker}")

    delta = reports["v2"].mean_scores["fields"] - reports["v1"].mean_scores["fields"]
    print(f"\nmean delta: {delta:+.3f}")
    print(
        "\nRecord what produced this number: prompt version, model "
        f"({FAST_MODEL}), dataset version, date. Otherwise the next run is not "
        "comparable."
    )


if __name__ == "__main__":
    main()
