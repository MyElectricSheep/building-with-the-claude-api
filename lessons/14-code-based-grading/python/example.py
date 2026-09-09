"""Lesson 14 - Code based grading.

Runs entirely locally. No API key, no network, no cost - which is the point:
code graders are free, so use them for everything they can cover.

    uv run lesson 14
"""

from __future__ import annotations

from course.graders import (
    avoids_phrases,
    exact_fields,
    is_valid_json,
    is_valid_python,
    matches_pattern,
    within_word_count,
)

# Pre-baked "model outputs", including the failure modes you actually see.
SAMPLES = {
    "clean json": '{"category":"billing","urgency":"high"}',
    "chatty json": 'Sure! Here is your JSON:\n{"category":"billing"}',
    "valid python": "def add(a, b):\n    return a + b\n",
    "broken python": "def add(a, b)\n    return a + b\n",
    "iso date": "2026-09-09",
    "prose date": "the ninth of September",
    "right length": "Customer was double-charged and needs a refund today.",
    "too long": " ".join(["word"] * 40),
    "no filler": "Refund the duplicate charge on order A-77210.",
    "filler": "As an AI language model, I would suggest issuing a refund.",
}


def show(label: str, result) -> None:  # noqa: ANN001
    mark = "PASS" if result.score >= 1 else "FAIL"
    print(f"  {mark}  {label:<16} score {result.score:.2f}  {result.reason}")


def main() -> None:
    print("is_valid_json - the classic: did we get JSON or a sentence?")
    show("clean json", is_valid_json(SAMPLES["clean json"]))
    show("chatty json", is_valid_json(SAMPLES["chatty json"]))
    print(
        "    With output_config.format the 'chatty json' failure mode stops\n"
        "    happening at all - see lesson 8.\n"
    )

    print("is_valid_python - ast.parse checks SYNTAX. Nothing is executed.")
    show("valid python", is_valid_python(SAMPLES["valid python"]))
    show("broken python", is_valid_python(SAMPLES["broken python"]))
    print("    To grade behaviour you need a sandbox - see lesson 46.\n")

    print("matches_pattern - shape checks")
    iso = matches_pattern(r"^\d{4}-\d{2}-\d{2}$", "ISO date")
    show("iso date", iso(SAMPLES["iso date"]))
    show("prose date", iso(SAMPLES["prose date"]))
    print()

    print("within_word_count - length bounds")
    brief = within_word_count(5, 20)
    show("right length", brief(SAMPLES["right length"]))
    show("too long", brief(SAMPLES["too long"]))
    print()

    print("avoids_phrases - banned filler")
    no_filler = avoids_phrases(["as an AI", "I cannot", "certainly!"])
    show("no filler", no_filler(SAMPLES["no filler"]))
    show("filler", no_filler(SAMPLES["filler"]))
    print()

    print("exact_fields - partial credit across labelled fields")
    grade = exact_fields(["category", "urgency", "has_order_id"])
    expected = {"category": "billing", "urgency": "high", "has_order_id": True}
    show("all correct", grade(dict(expected), expected))
    show("one wrong", grade({**expected, "urgency": "low"}, expected))
    all_wrong = {"category": "bug", "urgency": "low", "has_order_id": False}
    show("all wrong", grade(all_wrong, expected))

    print(
        "\nEvery grader above has unit tests in tests/python/test_evals.py.\n"
        "A grader that silently returns 1.0 for everything is worse than no\n"
        "grader, so test the tests."
    )


if __name__ == "__main__":
    main()
