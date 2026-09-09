"""Lesson 15 - Prompt engineering as a measured loop.

Two prompts, two splits, one 2x2. A prompt that improves on train and collapses
on held-out was fitted to the training set - that is what this lesson exists to
make visible.

`PromptEvaluator` is course scaffolding, not an SDK feature. The harness this
uses (course.evals) is ~150 lines of ordinary application code.

    uv run lesson 15
"""

from __future__ import annotations

from course.config import FAST_MODEL, create_client
from course.evals import run_eval
from course.graders import exact_fields
from course.triage import (
    PROMPT_V1,
    PROMPT_V2,
    load_cases,
    load_held_out_cases,
    triage,
)

GRADED_FIELDS = ["category", "urgency", "has_order_id"]


def main() -> None:
    client = create_client()
    splits = {"train": load_cases(), "held-out": load_held_out_cases()}
    prompts = {"v1": PROMPT_V1, "v2": PROMPT_V2}

    scores: dict[tuple[str, str], float] = {}
    failures: dict[tuple[str, str], list[str]] = {}

    for prompt_label, prompt in prompts.items():
        for split_label, cases in splits.items():
            report = run_eval(
                cases=cases,
                run=lambda email, p=prompt: triage(client, FAST_MODEL, p, email),
                graders={"fields": exact_fields(GRADED_FIELDS)},
                concurrency=3,
            )
            scores[(prompt_label, split_label)] = report.mean_scores["fields"]
            failures[(prompt_label, split_label)] = [
                result.id
                for result in report.results
                if result.error or result.grades["fields"].score < 1
            ]

    print(f"model {FAST_MODEL}\n")
    print(f"{'':<12}{'train':>10}{'held-out':>12}")
    for prompt_label in prompts:
        train = scores[(prompt_label, "train")]
        held = scores[(prompt_label, "held-out")]
        print(f"prompt {prompt_label:<5}{train:>10.3f}{held:>12.3f}")

    print("\ncases still wrong")
    for key, ids in failures.items():
        print(f"  {key[0]:<3} {key[1]:<9} {', '.join(ids) if ids else '(none)'}")

    train_delta = scores[("v2", "train")] - scores[("v1", "train")]
    held_delta = scores[("v2", "held-out")] - scores[("v1", "held-out")]
    print(f"\nv1 -> v2   train {train_delta:+.3f}   held-out {held_delta:+.3f}")

    if train_delta > 0 and held_delta <= 0:
        print(
            "\nTrain improved, held-out did not. That is a prompt fitted to the\n"
            "training set. The held-out number is the one that predicts anything."
        )
    else:
        print(
            "\nThe improvement generalised. Now change ONE more thing and repeat -\n"
            "and record the prompt version, model and dataset version with the score."
        )


if __name__ == "__main__":
    main()
