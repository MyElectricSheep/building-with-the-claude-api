"""Lesson runner for the Python implementations.

    uv run lesson 03            # lessons/03-*/python/example.py
    uv run lesson 06 legacy     # lessons/06-*/python/legacy.py
    uv run lesson 40 -- --help  # everything after a bare -- goes to the lesson
"""

from __future__ import annotations

import runpy
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
LESSONS_DIR = REPO_ROOT / "lessons"

USAGE = """Usage: uv run lesson <number|slug> [variant] [-- args...]
Example: uv run lesson 03
         uv run lesson 06 legacy"""


def resolve_lesson_dir(lessons: list[str], spec: str) -> str:
    """Resolve "3", "03" or "03-making-a-request" to a lesson directory name."""
    padded = spec.zfill(2) if spec.isdigit() else spec
    if padded in lessons:
        return padded
    by_number = [name for name in lessons if name.startswith(f"{padded}-")]
    if len(by_number) == 1:
        return by_number[0]
    by_slug = [name for name in lessons if padded in name]
    if len(by_slug) == 1:
        return by_slug[0]
    if len(by_slug) > 1:
        raise SystemExit(f'"{spec}" matches several lessons: {", ".join(by_slug)}')
    raise SystemExit(f'No lesson matches "{spec}".')


def main() -> None:
    argv = sys.argv[1:]
    if not argv or argv[0] in {"-h", "--help"}:
        print(USAGE)
        raise SystemExit(0 if argv else 1)

    spec, *rest = argv
    lessons = sorted(p.name for p in LESSONS_DIR.iterdir() if p.is_dir())
    lesson = resolve_lesson_dir(lessons, spec)

    if "--" in rest:
        split = rest.index("--")
        positional, forwarded = rest[:split], rest[split + 1 :]
    else:
        positional, forwarded = rest, []

    variant = positional[0] if positional else "example"
    entry = LESSONS_DIR / lesson / "python" / f"{variant}.py"

    if not entry.exists():
        directory = LESSONS_DIR / lesson / "python"
        if directory.exists():
            available = ", ".join(sorted(p.name for p in directory.glob("*.py")))
        else:
            available = "(no python/ directory - this lesson is conceptual)"
        print(
            f"No {variant}.py in {lesson}/python. Available: {available}\n"
            f"See lessons/{lesson}/README.md",
            file=sys.stderr,
        )
        raise SystemExit(1)

    sys.argv = [str(entry), *forwarded]
    print(f"$ python {entry.relative_to(REPO_ROOT)}", file=sys.stderr)
    runpy.run_path(str(entry), run_name="__main__")
