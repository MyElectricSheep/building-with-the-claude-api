"""Lesson 16 - Being clear and direct.

Three prompts for one task, graded by code rather than by eye. "Good output" and
"the output I asked for" are different measurements.

    uv run lesson 16
"""

from __future__ import annotations

from course.blocks import parse_structured, text_of
from course.config import FAST_MODEL, create_client
from course.graders import avoids_phrases, matches_pattern, within_word_count

FACTS = """Product: Kestrel CLI
Released: 2026-03-04
What it does: formats and lints SQL migration files
Notable: runs offline; no config file required"""

VAGUE = "Tell me about this product."

CLEAR = """Write release-note copy for this product.

Requirements:
- Between 25 and 60 words.
- Start with the product name. No preamble, no "Sure" or "Here is".
- Include the release date exactly as given.
- Plain prose, no bullet points."""

SCHEMA = {
    "type": "object",
    "properties": {"copy": {"type": "string"}},
    "required": ["copy"],
    "additionalProperties": False,
}

GRADERS = {
    "word count": within_word_count(25, 60),
    "no preamble": avoids_phrases(["Sure,", "Certainly", "Here is", "Here's"]),
    "has date": matches_pattern(r"2026-03-04", "release date"),
}


def grade(label: str, output: str) -> None:
    print(f"--- {label} ---")
    print(output.strip())
    print()
    for name, grader in GRADERS.items():
        result = grader(output)
        mark = "PASS" if result.score >= 1 else "FAIL"
        print(f"  {mark}  {name:<12} {result.reason}")
    print()


def main() -> None:
    client = create_client()

    for label, prompt in (("vague", VAGUE), ("clear", CLEAR)):
        response = client.messages.create(
            model=FAST_MODEL,
            max_tokens=400,
            messages=[{"role": "user", "content": f"{prompt}\n\n{FACTS}"}],
        )
        grade(label, text_of(response))

    # Clear instructions AND a schema. Saying it in words is good; constraining
    # the shape is better - see lesson 8.
    response = client.messages.create(
        model=FAST_MODEL,
        max_tokens=400,
        messages=[{"role": "user", "content": f"{CLEAR}\n\n{FACTS}"}],
        output_config={"format": {"type": "json_schema", "schema": SCHEMA}},
    )
    grade("clear + schema", parse_structured(response)["copy"])

    print(
        "The vague prompt usually produces perfectly reasonable prose that fails\n"
        "the format graders. Clear instructions fix the format; a schema removes\n"
        "the question of whether the wrapper parses at all."
    )


if __name__ == "__main__":
    main()
