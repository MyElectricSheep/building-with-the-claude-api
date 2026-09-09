import pytest
from course.cli import resolve_lesson_dir

LESSONS = [
    "01-accessing-the-api",
    "03-making-a-request",
    "13-model-based-grading",
    "30-the-text-edit-tool",
    "31-the-web-search-tool",
]


def test_resolves_bare_number():
    assert resolve_lesson_dir(LESSONS, "3") == "03-making-a-request"
    assert resolve_lesson_dir(LESSONS, "03") == "03-making-a-request"
    assert resolve_lesson_dir(LESSONS, "13") == "13-model-based-grading"


def test_resolves_full_slug():
    assert resolve_lesson_dir(LESSONS, "31-the-web-search-tool") == (
        "31-the-web-search-tool"
    )


def test_resolves_unique_partial_slug():
    assert resolve_lesson_dir(LESSONS, "web-search") == "31-the-web-search-tool"


def test_rejects_ambiguous_slug():
    with pytest.raises(SystemExit, match="matches several"):
        resolve_lesson_dir(LESSONS, "the-")


def test_rejects_unknown_lesson():
    with pytest.raises(SystemExit, match="No lesson matches"):
        resolve_lesson_dir(LESSONS, "99")
