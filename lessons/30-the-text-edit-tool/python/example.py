"""Lesson 30 - The text editor tool.

Current version and name: text_editor_20250728 / str_replace_based_edit_tool.
`undo_edit` was removed. Everything runs against a sandbox under assets/.

    uv run lesson 30
"""

from __future__ import annotations

import shutil

from course.blocks import append_assistant_turn, text_of, tool_uses
from course.config import MODEL, REPO_ROOT, create_client
from course.editor import SandboxedEditor

SANDBOX = REPO_ROOT / "assets" / "sandbox" / "lesson-30"

BUGGY_SOURCE = '''"""Prime helpers."""


def is_prime(n):
    if n < 2:
        return False
    for divisor in range(2, int(n ** 0.5) + 1)
        if n % divisor == 0:
            return False
    return True


def primes_up_to(limit):
    return [n for n in range(limit + 1) if is_prime(n)]
'''

# The Anthropic-defined text editor tool. Schema-less: no input_schema.
# The type/name pair must match, and max_characters needs 20250728 or later.
EDITOR_TOOL = {
    "type": "text_editor_20250728",
    "name": "str_replace_based_edit_tool",
    "max_characters": 10_000,
}


def main() -> None:
    if SANDBOX.exists():
        shutil.rmtree(SANDBOX)
    editor = SandboxedEditor(SANDBOX)
    (SANDBOX / "primes.py").write_text(BUGGY_SOURCE, encoding="utf-8")

    print(f"sandbox: {SANDBOX.relative_to(REPO_ROOT)}")
    print("primes.py has a syntax error on line 7 (a missing colon).\n")

    client = create_client()
    messages = [
        {
            "role": "user",
            "content": (
                "There is a syntax error in primes.py that stops it running. "
                "View the file, fix it, and tell me what you changed."
            ),
        }
    ]

    for turn in range(1, 9):
        response = client.messages.create(
            model=MODEL, max_tokens=2000, tools=[EDITOR_TOOL], messages=messages
        )
        append_assistant_turn(messages, response)

        calls = tool_uses(response)
        if not calls:
            print(f"\nturn {turn}: done\n")
            print(text_of(response))
            break

        results = []
        for call in calls:
            command = call.input.get("command")
            print(f"turn {turn}: {command} {call.input.get('path')}")
            result = editor.handle(call.input)
            marker = "ERROR" if result.is_error else "ok"
            first_line = result.content.split("\n")[0][:80]
            print(f"         -> {marker}: {first_line}")
            results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": call.id,
                    "content": result.content,
                    "is_error": result.is_error,
                }
            )
        messages.append({"role": "user", "content": results})
    else:
        print("turn limit reached")

    print("\n--- the file now ---")
    print((SANDBOX / "primes.py").read_text(encoding="utf-8"))

    print("--- what a model attempting undo_edit would get back ---")
    refusal = editor.handle({"command": "undo_edit", "path": "primes.py"})
    print(f"is_error={refusal.is_error}: {refusal.content}")
    print(
        "\nundo_edit was removed in text_editor_20250429. A backup file was\n"
        "written before the edit instead - that is now your undo."
    )


if __name__ == "__main__":
    main()
