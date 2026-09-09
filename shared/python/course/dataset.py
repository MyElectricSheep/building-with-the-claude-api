"""Validation for generated eval cases (lesson 11). Pure - unit tested.

A model generating its own test data will produce duplicates, labels outside the
enum, and emails that contradict their own labels. Catch what code can catch; a
human still reviews the rest.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from course.triage import CATEGORIES, URGENCIES

#: An order identifier: a token with a digit, introduced by # or the word "order".
ORDER_ID_PATTERN = re.compile(r"(?:#|\border\s+#?)([A-Za-z]*-?\d[\w-]*)", re.IGNORECASE)


@dataclass(frozen=True)
class ValidationIssue:
    id: str
    problem: str


def validate_cases(
    cases: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[ValidationIssue]]:
    accepted: list[dict[str, Any]] = []
    issues: list[ValidationIssue] = []
    seen: set[str] = set()

    for candidate in cases:
        problems: list[str] = []
        expected = candidate.get("expected") or {}
        case_id = candidate.get("id") or ""
        text = candidate.get("input") or ""

        if not case_id:
            problems.append("missing id")
        elif case_id in seen:
            problems.append("duplicate id")

        if len(text.strip()) < 20:
            problems.append("email too short to be a realistic case")
        if expected.get("category") not in CATEGORIES:
            problems.append(f'category "{expected.get("category")}" not in the enum')
        if expected.get("urgency") not in URGENCIES:
            problems.append(f'urgency "{expected.get("urgency")}" not in the enum')

        # The label must agree with the text. This is the check that actually
        # catches bad generated data.
        looks_like_it_has_an_id = bool(ORDER_ID_PATTERN.search(text))
        if isinstance(expected.get("has_order_id"), bool) and (
            expected["has_order_id"] != looks_like_it_has_an_id
        ):
            problems.append(
                f"has_order_id={expected['has_order_id']} contradicts the email text"
            )

        if problems:
            issues.append(ValidationIssue(case_id or "(no id)", "; ".join(problems)))
            continue
        seen.add(case_id)
        accepted.append({**candidate, "reviewed": False})

    return accepted, issues
