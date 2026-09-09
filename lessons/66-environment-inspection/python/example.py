"""Lesson 66 - Environment inspection.

The same repair task, blind and inspecting. The blind agent plausibly succeeds
and actually does not; the inspecting agent finds out because the test fails.

The observation here is RUNNING THE CODE, not taking a screenshot. That is the
correction: the right observation depends on the environment.

    uv run lesson 66
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from typing import Any

from course.blocks import append_assistant_turn, text_of, tool_uses
from course.config import MODEL, REPO_ROOT, create_client
from course.editor import SandboxedEditor

SOURCE = REPO_ROOT / "assets" / "data" / "buggy_stats.py"
TASK = (
    "stats.py has failing checks. Fix it so every check passes. "
    "Use the editor tool."
)

EDITOR_TOOL = {
    "type": "text_editor_20250728",
    "name": "str_replace_based_edit_tool",
    "max_characters": 10_000,
}

RUN_TOOL = {
    "name": "run_checks",
    "description": (
        "Execute stats.py and return its output. This is the ONLY way to know "
        "whether an edit worked."
    ),
    "strict": True,
    "input_schema": {
        "type": "object",
        "properties": {},
        "required": [],
        "additionalProperties": False,
    },
}


def fresh_sandbox(name: str) -> SandboxedEditor:
    root = REPO_ROOT / "assets" / "sandbox" / name
    if root.exists():
        shutil.rmtree(root)
    editor = SandboxedEditor(root)
    shutil.copyfile(SOURCE, root / "stats.py")
    return editor


def run_checks(root) -> str:  # noqa: ANN001
    """Observe the environment: actually execute the file."""
    try:
        completed = subprocess.run(  # noqa: S603
            [sys.executable, "stats.py"],
            cwd=str(root),
            capture_output=True,
            text=True,
            timeout=20,
        )
    except subprocess.TimeoutExpired:
        return "TIMEOUT"
    return (completed.stdout + completed.stderr).strip() or "(no output)"


def run_agent(client, label: str, *, inspecting: bool) -> str:  # noqa: ANN001
    print(f"=== {label} ===")
    editor = fresh_sandbox("lesson-66-" + ("inspect" if inspecting else "blind"))
    tools: list[Any] = [EDITOR_TOOL]
    if inspecting:
        tools.append(RUN_TOOL)

    system = (
        "Fix the file. After every edit, run run_checks and keep going until it "
        "reports PASS. Never claim success without a PASS from run_checks."
        if inspecting
        else "Fix the file. When you believe it is correct, say so."
    )

    messages: list[dict[str, Any]] = [{"role": "user", "content": TASK}]
    for turn in range(1, 11):
        response = client.messages.create(
            model=MODEL, max_tokens=2500, system=system, tools=tools, messages=messages
        )
        append_assistant_turn(messages, response)
        calls = tool_uses(response)
        if not calls:
            print(f"  turn {turn}: the agent stopped")
            print(f"  claim: {text_of(response).strip()[:200]}")
            break

        results = []
        for call in calls:
            if call.name == "run_checks":
                output = run_checks(editor.root)
                print(f"  turn {turn}: run_checks -> {output[:90]}")
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": call.id,
                        "content": output,
                        "is_error": not output.startswith("PASS"),
                    }
                )
                continue
            outcome = editor.handle(dict(call.input))
            command = call.input.get("command")
            marker = "ERROR" if outcome.is_error else "ok"
            print(f"  turn {turn}: {command} -> {marker}")
            results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": call.id,
                    "content": outcome.content,
                    "is_error": outcome.is_error,
                }
            )
        messages.append({"role": "user", "content": results})
    else:
        print("  turn limit reached")

    # The ground truth, whatever the agent said.
    verdict = run_checks(editor.root)
    print(f"  ACTUAL: {verdict}\n")
    return verdict


def main() -> None:
    client = create_client()
    print(f"task: {TASK}\n")
    print("the file has two bugs: one obvious, one that only shows on empty input\n")

    blind = run_agent(client, "blind - no way to observe the result", inspecting=False)
    inspecting = run_agent(
        client, "inspecting - can run the code and read the output", inspecting=True
    )

    print("=== verdicts ===")
    print(f"  blind:      {blind.splitlines()[0]}")
    print(f"  inspecting: {inspecting.splitlines()[0]}")

    blind_ok = blind.startswith("PASS")
    print(
        "\nThe blind agent often succeeds - it did on this run if the line above\n"
        f"says PASS ({'it did' if blind_ok else 'it did not'}). That is not the\n"
        "point, and a lesson that needed it to fail would be a rigged one.\n\n"
        "The point is that the blind agent CLAIMED success and had no way to\n"
        "know. The only reason you know whether it was right is the ACTUAL line -\n"
        "which this script computed by running the code itself, after the agent\n"
        "had finished. In production nobody runs that line for you.\n\n"
        "The inspecting agent saw FAIL, kept going, and stopped on evidence.\n"
        "Same outcome, completely different epistemics.\n\n"
        "And note WHAT the observation was: running the code. Reaching for a\n"
        "screenshot when you could read the file back is a lossier, more\n"
        "expensive loop, not a more sophisticated one."
    )
    print(json.dumps({"blind": blind, "inspecting": inspecting}))


if __name__ == "__main__":
    main()
