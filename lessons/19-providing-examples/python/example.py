"""Lesson 19 - Providing examples.

Zero-shot vs few-shot vs specified, scored on the held-out split. Examples and
specification are two routes to the same place; which wins is empirical.

    uv run lesson 19
"""

from __future__ import annotations

from course.config import FAST_MODEL, create_client
from course.evals import run_eval
from course.examples import render_shots
from course.graders import exact_fields
from course.triage import PROMPT_V1, PROMPT_V2, load_held_out_cases, triage

GRADED_FIELDS = ["category", "urgency", "has_order_id"]

# Few-shot: the terse prompt plus four diverse examples. The examples sit before
# the variable input, which is also where prompt caching wants them (lesson 43).
PROMPT_FEWSHOT = f"""{PROMPT_V1}

{render_shots()}"""


def main() -> None:
    client = create_client()
    cases = load_held_out_cases()

    prompts = {
        "zero-shot": PROMPT_V1,
        "few-shot": PROMPT_FEWSHOT,
        "specified": PROMPT_V2,
    }

    print(f"{len(cases)} held-out cases | model {FAST_MODEL}\n")

    for label, prompt in prompts.items():
        report = run_eval(
            cases=cases,
            run=lambda email, p=prompt: triage(client, FAST_MODEL, p, email),
            graders={"fields": exact_fields(GRADED_FIELDS)},
            concurrency=2,
        )
        wrong = [
            result.id
            for result in report.results
            if result.error or result.grades["fields"].score < 1
        ]
        print(
            f"{label:<12} {report.mean_scores['fields']:.3f}   "
            f"wrong: {', '.join(wrong) if wrong else '(none)'}"
        )

    print(
        "\nIf your examples exist only to show the JSON shape, delete them and use\n"
        "output_config.format - cheaper, and a guarantee rather than a hint. Keep\n"
        "examples for judgement: which category a borderline case belongs in."
    )


if __name__ == "__main__":
    main()
