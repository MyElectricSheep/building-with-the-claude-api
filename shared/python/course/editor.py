"""A sandboxed handler for the Anthropic-defined text editor tool
(``text_editor_20250728`` / ``str_replace_based_edit_tool``), lesson 30.

The tool is schema-less: Anthropic defines the commands, your application
executes them. Which means the safety is yours to write.

Commands: view, str_replace, create, insert.
``undo_edit`` was REMOVED in text_editor_20250429 - it is not implemented here,
and a request for it returns an error result.
"""

from __future__ import annotations

import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class EditorResult:
    content: str
    is_error: bool


class SandboxedEditor:
    def __init__(self, root: str | Path, max_characters: int = 10_000) -> None:
        self.root = Path(root).resolve()
        self.max_characters = max_characters
        self.root.mkdir(parents=True, exist_ok=True)

    def _safe_path(self, candidate: str) -> Path:
        """Resolve a model-supplied path inside the sandbox, or refuse.

        ``../../.ssh/id_rsa`` is a perfectly reasonable-looking ``path`` for a
        model to emit. Your process is the one doing the writing.
        """
        resolved = (self.root / candidate).resolve()
        if not resolved.is_relative_to(self.root):
            raise ValueError(f"Path escapes the sandbox: {candidate}")
        return resolved

    def _backup(self, path: Path) -> None:
        """Anthropic's guidance recommends a backup. ``undo_edit`` is gone."""
        if path.exists():
            shutil.copyfile(path, path.with_suffix(path.suffix + ".backup"))

    def handle(self, tool_input: dict[str, Any]) -> EditorResult:
        try:
            command = str(tool_input.get("command", ""))
            if command == "view":
                return self._view(tool_input)
            if command == "str_replace":
                return self._str_replace(tool_input)
            if command == "create":
                return self._create(tool_input)
            if command == "insert":
                return self._insert(tool_input)
            if command == "undo_edit":
                # Removed in text_editor_20250429. Say so plainly so the model
                # can pick a different approach.
                return EditorResult(
                    "Error: undo_edit is not supported by text_editor_20250728. "
                    "Supported commands: view, str_replace, create, insert.",
                    True,
                )
            return EditorResult(
                f"Error: unknown command {command!r}. "
                "Supported commands: view, str_replace, create, insert.",
                True,
            )
        except Exception as error:  # noqa: BLE001
            return EditorResult(f"Error: {error}", True)

    def _view(self, tool_input: dict[str, Any]) -> EditorResult:
        path = self._safe_path(str(tool_input.get("path", "")))
        if not path.exists():
            return EditorResult("Error: File not found", True)
        if path.is_dir():
            return EditorResult(
                "\n".join(sorted(child.name for child in path.iterdir())), False
            )

        lines = path.read_text(encoding="utf-8").split("\n")
        start, end = 1, len(lines)
        view_range = tool_input.get("view_range")
        if isinstance(view_range, list) and len(view_range) == 2:
            start = int(view_range[0])
            # -1 means "to the end of the file".
            end = len(lines) if int(view_range[1]) == -1 else int(view_range[1])

        numbered = "\n".join(
            f"{start + offset:>5}\t{line}"
            for offset, line in enumerate(lines[start - 1 : end])
        )
        # max_characters, new in text_editor_20250728.
        if len(numbered) > self.max_characters:
            numbered = numbered[: self.max_characters] + "\n... [truncated]"
        return EditorResult(numbered, False)

    def _str_replace(self, tool_input: dict[str, Any]) -> EditorResult:
        path = self._safe_path(str(tool_input.get("path", "")))
        if not path.exists():
            return EditorResult("Error: File not found", True)

        old_str = str(tool_input.get("old_str", ""))
        new_str = str(tool_input.get("new_str", ""))
        original = path.read_text(encoding="utf-8")

        # Exactly one match, or refuse. A silent replace-all is a corrupted file.
        occurrences = original.count(old_str)
        if occurrences == 0:
            return EditorResult("Error: old_str not found in the file", True)
        if occurrences > 1:
            return EditorResult(
                f"Error: old_str matched {occurrences} times; "
                "it must match exactly once",
                True,
            )

        self._backup(path)
        path.write_text(original.replace(old_str, new_str, 1), encoding="utf-8")
        return EditorResult("Edit applied.", False)

    def _create(self, tool_input: dict[str, Any]) -> EditorResult:
        path = self._safe_path(str(tool_input.get("path", "")))
        self._backup(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(str(tool_input.get("file_text", "")), encoding="utf-8")
        return EditorResult(f"Created {path.relative_to(self.root)}.", False)

    def _insert(self, tool_input: dict[str, Any]) -> EditorResult:
        path = self._safe_path(str(tool_input.get("path", "")))
        if not path.exists():
            return EditorResult("Error: File not found", True)

        lines = path.read_text(encoding="utf-8").split("\n")
        at = int(tool_input.get("insert_line", 0))  # 0 means "before line 1"
        if at < 0 or at > len(lines):
            return EditorResult(
                f"Error: insert_line {at} is outside 0..{len(lines)}", True
            )
        self._backup(path)
        lines.insert(at, str(tool_input.get("insert_text", "")))
        path.write_text("\n".join(lines), encoding="utf-8")
        return EditorResult(f"Inserted after line {at}.", False)
