import threading
import time

import pytest
from course.evals import (
    CaseResult,
    GradeResult,
    format_report,
    map_with_concurrency,
    summarise,
)
from course.graders import (
    avoids_phrases,
    exact_fields,
    is_valid_json,
    is_valid_python,
    matches_pattern,
    within_word_count,
)


def test_map_with_concurrency_preserves_order():
    def work(n):
        time.sleep(n / 1000)
        return n * 2

    assert map_with_concurrency([5, 1, 3], 2, work) == [10, 2, 6]


def test_map_with_concurrency_never_exceeds_limit():
    lock = threading.Lock()
    state = {"in_flight": 0, "peak": 0}

    def work(_):
        with lock:
            state["in_flight"] += 1
            state["peak"] = max(state["peak"], state["in_flight"])
        time.sleep(0.005)
        with lock:
            state["in_flight"] -= 1
        return None

    map_with_concurrency(list(range(12)), 3, work)
    assert state["peak"] <= 3


def test_map_with_concurrency_rejects_bad_limit():
    with pytest.raises(ValueError, match="limit"):
        map_with_concurrency([1], 0, lambda x: x)


def test_map_with_concurrency_handles_empty_input():
    assert map_with_concurrency([], 4, lambda x: x) == []


def test_summarise_separates_errors_from_failures():
    results = [
        CaseResult(id="a", output="x", grades={"g": GradeResult(1.0)}),
        CaseResult(id="b", output="y", grades={"g": GradeResult(0.0)}),
        CaseResult(id="c", error="boom"),
    ]
    report = summarise(results, ["g"])
    assert (report.passed, report.failed, report.errored) == (1, 1, 1)
    # The errored case must not drag the mean down - it was never graded.
    assert report.mean_scores["g"] == 0.5


def test_summarise_reports_zero_when_nothing_graded():
    report = summarise([CaseResult(id="a", error="x")], ["g"])
    assert report.mean_scores["g"] == 0.0
    assert report.errored == 1


def test_format_report_renders_every_case():
    report = summarise(
        [
            CaseResult(id="alpha", output="x", grades={"g": GradeResult(1.0, "ok")}),
            CaseResult(id="b", error="boom"),
        ],
        ["g"],
    )
    text = format_report(report, ["g"])
    assert "alpha" in text
    assert "ERROR" in text
    assert "mean g: 1.000" in text


def test_exact_fields_scores_partial_matches():
    grade = exact_fields(["a", "b"])
    assert grade({"a": 1, "b": 2}, {"a": 1, "b": 2}).score == 1
    assert grade({"a": 1, "b": 9}, {"a": 1, "b": 2}).score == 0.5
    assert grade({"a": 8, "b": 9}, {"a": 1, "b": 2}).score == 0


def test_code_graders():
    assert is_valid_json('{"a":1}').score == 1
    assert is_valid_json("Sure! Here is your JSON:").score == 0
    assert is_valid_python("x = 1\n").score == 1
    assert is_valid_python("def (:").score == 0
    assert matches_pattern(r"^\d{4}-\d{2}-\d{2}$")("2026-09-09").score == 1
    assert matches_pattern(r"^\d{4}$")("nope").score == 0
    assert within_word_count(2, 4)("one two three").score == 1
    assert within_word_count(2, 4)("one").score == 0
    assert avoids_phrases(["as an AI"])("Sure, here you go.").score == 1
    assert avoids_phrases(["as an AI"])("As an AI language model...").score == 0
