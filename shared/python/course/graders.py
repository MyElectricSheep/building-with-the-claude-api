"""Code-based graders (lesson 14). Pure, deterministic, free to run.

Anthropic's evaluation guidance ranks graders in this order:
    code-based   - fast, deterministic, preferred wherever it is possible
    model-based  - for nuanced judgements, with an explicit rubric
    human        - flexible, slow, expensive

Reach for a model judge only for what code cannot check.
"""

from __future__ import annotations

import ast
import json
import re
from collections.abc import Callable, Sequence
from typing import Any

from course.evals import GradeResult


def exact_fields(fields: Sequence[str]) -> Callable[..., GradeResult]:
    """Every listed field matches the expected value exactly."""

    def grade(output: dict[str, Any], expected: dict[str, Any], *_: Any) -> GradeResult:
        wrong = [f for f in fields if output.get(f) != expected.get(f)]
        if not wrong:
            return GradeResult(1.0, "all fields match")
        detail = ", ".join(
            f"{f}: got {output.get(f)!r}, want {expected.get(f)!r}" for f in wrong
        )
        return GradeResult(1 - len(wrong) / len(fields), detail)

    return grade


def is_valid_json(output: str, *_: Any) -> GradeResult:
    """The text parses as JSON."""
    try:
        json.loads(output)
    except (json.JSONDecodeError, TypeError) as error:
        return GradeResult(0.0, f"not JSON: {error}")
    return GradeResult(1.0, "parses")


def is_valid_python(output: str, *_: Any) -> GradeResult:
    """The text parses as Python. Syntax only - it is not executed."""
    try:
        ast.parse(output)
    except SyntaxError as error:
        return GradeResult(0.0, f"SyntaxError: {error.msg}")
    return GradeResult(1.0, "parses")


def matches_pattern(pattern: str, label: str = "pattern") -> Callable[..., GradeResult]:
    """The text matches a regular expression."""
    compiled = re.compile(pattern)

    def grade(output: str, *_: Any) -> GradeResult:
        if compiled.search(output):
            return GradeResult(1.0, f"{label} matched")
        return GradeResult(0.0, f"{label} did not match")

    return grade


def within_word_count(minimum: int, maximum: int) -> Callable[..., GradeResult]:
    """Word count falls inside an inclusive range."""

    def grade(output: str, *_: Any) -> GradeResult:
        words = len(output.split())
        if minimum <= words <= maximum:
            return GradeResult(1.0, f"{words} words")
        return GradeResult(0.0, f"{words} words, wanted {minimum}-{maximum}")

    return grade


def avoids_phrases(phrases: Sequence[str]) -> Callable[..., GradeResult]:
    """None of the listed strings appears in the output (case-insensitive)."""

    def grade(output: str, *_: Any) -> GradeResult:
        lower = output.lower()
        found = [phrase for phrase in phrases if phrase.lower() in lower]
        if not found:
            return GradeResult(1.0, "no banned phrases")
        return GradeResult(0.0, f"contains: {', '.join(found)}")

    return grade
