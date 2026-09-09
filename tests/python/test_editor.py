from pathlib import Path

import pytest
from course.editor import SandboxedEditor


@pytest.fixture
def editor(tmp_path: Path) -> SandboxedEditor:
    return SandboxedEditor(tmp_path / "sandbox")


def test_create_then_view_round_trips(editor: SandboxedEditor):
    created = editor.handle(
        {"command": "create", "path": "notes.txt", "file_text": "alpha\nbeta\ngamma"}
    )
    assert created.is_error is False

    viewed = editor.handle({"command": "view", "path": "notes.txt"})
    assert viewed.is_error is False
    assert "alpha" in viewed.content
    assert "1\t" in viewed.content


def test_view_range_including_minus_one(editor: SandboxedEditor):
    editor.handle({"command": "create", "path": "a.txt", "file_text": "1\n2\n3\n4\n5"})
    middle = editor.handle({"command": "view", "path": "a.txt", "view_range": [2, 3]})
    assert "2\t2" in middle.content
    assert "4\t4" not in middle.content

    to_end = editor.handle({"command": "view", "path": "a.txt", "view_range": [4, -1]})
    assert "5\t5" in to_end.content


def test_missing_file_is_an_error_result_not_an_exception(editor: SandboxedEditor):
    result = editor.handle({"command": "view", "path": "nope.txt"})
    assert result.is_error is True
    assert "File not found" in result.content


def test_str_replace_requires_exactly_one_match(editor: SandboxedEditor):
    editor.handle({"command": "create", "path": "b.txt", "file_text": "x = 1\nx = 1\n"})

    many = editor.handle(
        {
            "command": "str_replace",
            "path": "b.txt",
            "old_str": "x = 1",
            "new_str": "x = 2",
        }
    )
    assert many.is_error is True
    assert "matched 2 times" in many.content

    none = editor.handle(
        {"command": "str_replace", "path": "b.txt", "old_str": "y = 9", "new_str": "z"}
    )
    assert none.is_error is True
    assert "not found" in none.content

    one = editor.handle(
        {
            "command": "str_replace",
            "path": "b.txt",
            "old_str": "x = 1\nx = 1",
            "new_str": "x = 2",
        }
    )
    assert one.is_error is False
    assert (editor.root / "b.txt").read_text() == "x = 2\n"
    # A backup was taken - undo_edit no longer exists to save you.
    assert "x = 1" in (editor.root / "b.txt.backup").read_text()


def test_insert_places_text_after_the_given_line(editor: SandboxedEditor):
    editor.handle({"command": "create", "path": "c.txt", "file_text": "one\ntwo"})
    editor.handle(
        {"command": "insert", "path": "c.txt", "insert_line": 0, "insert_text": "zero"}
    )
    assert (editor.root / "c.txt").read_text() == "zero\none\ntwo"

    out_of_range = editor.handle(
        {"command": "insert", "path": "c.txt", "insert_line": 99, "insert_text": "nope"}
    )
    assert out_of_range.is_error is True
    assert "outside" in out_of_range.content


def test_undo_edit_is_refused_with_supported_commands(editor: SandboxedEditor):
    result = editor.handle({"command": "undo_edit", "path": "a.txt"})
    assert result.is_error is True
    assert "not supported" in result.content
    assert "view, str_replace, create, insert" in result.content


def test_unknown_command_is_refused(editor: SandboxedEditor):
    result = editor.handle({"command": "rm_rf", "path": "a.txt"})
    assert result.is_error is True
    assert "unknown command" in result.content


def test_paths_cannot_escape_the_sandbox(editor: SandboxedEditor):
    (editor.root.parent / "escaped.txt").write_text("secret")
    for path in ("../escaped.txt", "../../etc/passwd", "/etc/passwd"):
        result = editor.handle({"command": "view", "path": path})
        assert result.is_error is True, path
        assert "escapes the sandbox" in result.content
