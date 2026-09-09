"""A minimal evaluation harness for lessons 9-15.

The Academy introduces a ``PromptEvaluator`` helper. That is *course
scaffolding*, not part of the Claude SDK - a point the lesson does not make
clearly enough. Everything here is ordinary application code you could delete
and rewrite in an afternoon. Nothing in this file is an API feature.

The pure pieces (bounded concurrency, scoring, reporting) are unit tested and
run with no credentials.

Named ``evals`` rather than ``eval`` to avoid shadowing the builtin.
"""

from __future__ import annotations

import time
from collections.abc import Callable, Iterable, Sequence
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class EvalCase:
    id: str
    input: Any
    expected: Any


@dataclass(frozen=True)
class GradeResult:
    #: 0..1. Use 0/1 for a pass/fail grader.
    score: float
    #: Why. Shown in the report; keep it short.
    reason: str = ""


@dataclass
class CaseResult:
    id: str
    output: Any = None
    grades: dict[str, GradeResult] = field(default_factory=dict)
    error: str | None = None
    #: Wall-clock milliseconds for the model call.
    duration_ms: int = 0


@dataclass
class EvalReport:
    results: list[CaseResult]
    #: Mean score per grader, over cases that produced output.
    mean_scores: dict[str, float]
    passed: int
    failed: int
    errored: int


def map_with_concurrency(
    items: Sequence[Any],
    limit: int,
    worker: Callable[[Any], Any],
) -> list[Any]:
    """Map with bounded concurrency, preserving input order.

    Evals fan out; rate limits do not. Five in flight is a sane default for a
    teaching repository - raise it once you know your tier's limits.

    A thread pool is the right tool here: the work is HTTP-bound, and the
    Anthropic sync client is thread-safe.
    """
    if limit < 1:
        raise ValueError("limit must be >= 1")
    if not items:
        return []
    with ThreadPoolExecutor(max_workers=min(limit, len(items))) as pool:
        return list(pool.map(worker, items))


def run_eval(
    cases: Iterable[EvalCase],
    run: Callable[[Any], Any],
    graders: dict[str, Callable[..., GradeResult]],
    concurrency: int = 5,
) -> EvalReport:
    """Run every case, grade it, and summarise."""
    case_list = list(cases)

    def one(test_case: EvalCase) -> CaseResult:
        started = time.monotonic()
        try:
            output = run(test_case.input)
            grades = {
                name: grader(output, test_case.expected, test_case.input)
                for name, grader in graders.items()
            }
            return CaseResult(
                id=test_case.id,
                output=output,
                grades=grades,
                duration_ms=int((time.monotonic() - started) * 1000),
            )
        except Exception as error:  # noqa: BLE001 - one bad case must not stop the run
            return CaseResult(
                id=test_case.id,
                error=f"{type(error).__name__}: {error}",
                duration_ms=int((time.monotonic() - started) * 1000),
            )

    results = map_with_concurrency(case_list, concurrency, one)
    return summarise(results, list(graders))


def summarise(results: list[CaseResult], grader_names: list[str]) -> EvalReport:
    """Turn raw case results into a report. Pure - tested without credentials."""
    graded = [result for result in results if result.error is None]
    mean_scores: dict[str, float] = {}

    for name in grader_names:
        scores = [
            result.grades[name].score for result in graded if name in result.grades
        ]
        mean_scores[name] = sum(scores) / len(scores) if scores else 0.0

    # A case "passes" when every grader gave it a full score.
    passed = sum(
        1
        for result in graded
        if all(
            result.grades.get(name, GradeResult(0)).score >= 1
            for name in grader_names
        )
    )

    return EvalReport(
        results=results,
        mean_scores=mean_scores,
        passed=passed,
        failed=len(graded) - passed,
        errored=len(results) - len(graded),
    )


def format_report(report: EvalReport, grader_names: list[str]) -> str:
    """Render a report as a fixed-width table."""
    id_width = max([4, *(len(result.id) for result in report.results)])
    lines = [
        "case".ljust(id_width)
        + "".join(f"  {name:>12}" for name in grader_names)
        + "   notes",
        "-" * (id_width + len(grader_names) * 14 + 30),
    ]

    for result in report.results:
        if result.error:
            lines.append(f"{result.id.ljust(id_width)}{'ERROR':>14}   {result.error}")
            continue
        scores = "".join(
            f"{result.grades.get(name, GradeResult(0)).score:>14.2f}"
            for name in grader_names
        )
        notes = "; ".join(
            result.grades[name].reason
            for name in grader_names
            if name in result.grades and result.grades[name].reason
        )
        lines.append(f"{result.id.ljust(id_width)}{scores}   {notes}")

    lines.append("")
    lines.extend(
        f"mean {name}: {report.mean_scores[name]:.3f}" for name in grader_names
    )
    lines.append(
        f"passed {report.passed} / failed {report.failed} / errored {report.errored}"
    )
    return "\n".join(lines)
