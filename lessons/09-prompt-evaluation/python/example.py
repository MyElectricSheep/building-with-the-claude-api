"""Lesson 9 - Prompt evaluation.

The smallest honest eval: a labelled dataset, one prompt, one code grader.
Everything in lessons 10-15 is this loop with more machinery around it.

    uv run lesson 09
"""

from __future__ import annotations

from course.config import FAST_MODEL, create_client
from course.evals import format_report, run_eval
from course.graders import exact_fields
from course.triage import PROMPT_V2, load_cases, triage

GRADED_FIELDS = ["category", "urgency", "has_order_id"]


def main() -> None:
    client = create_client()
    cases = load_cases()

    print(f"{len(cases)} cases, model {FAST_MODEL}\n")

    report = run_eval(
        cases=cases,
        run=lambda email: triage(client, FAST_MODEL, PROMPT_V2, email),
        graders={"fields": exact_fields(GRADED_FIELDS)},
        concurrency=3,
    )

    print(format_report(report, ["fields"]))
    print(
        "\nThat number is the point. Change the prompt, re-run, compare.\n"
        "Lesson 10 does exactly that."
    )


if __name__ == "__main__":
    main()
