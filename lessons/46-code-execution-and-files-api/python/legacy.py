"""Lesson 46 - the Academy's tool version and result parsing, preserved.

LEGACY. Two separate problems:

  1. `code_execution_20250522` is the legacy Python-only version.
  2. The result parsing looks for a bare `code_execution_output` block, which
     current versions do not return. That check silently matches nothing - the
     code does not error, it just finds no output.

This file runs the legacy tool version if the API still accepts it, and shows
BOTH parsers side by side against the same response.

    uv run lesson 46 legacy
"""

import anthropic
from course.config import MODEL

client = anthropic.Anthropic()

LEGACY_TOOL = {"type": "code_execution_20250522", "name": "code_execution"}

print(f"Requesting {LEGACY_TOOL['type']} on {MODEL}...\n")

try:
    response = client.messages.create(
        model=MODEL,
        max_tokens=3000,
        tools=[LEGACY_TOOL],
        messages=[
            {
                "role": "user",
                "content": "Compute the mean and standard deviation of 1..10.",
            }
        ],
    )
except anthropic.BadRequestError as error:
    print(f"400 from the API: {error.message}")
    print("\nUse code_execution_20260521 - see example.py.")
    raise SystemExit(0) from None

print("blocks:", [block.type for block in response.content])
print()

# LEGACY parser: looks for a block type current versions do not emit.
legacy_hits = [b for b in response.content if b.type == "code_execution_output"]
print(f"legacy parser  (code_execution_output):        {len(legacy_hits)} block(s)")

# CURRENT parser.
current_hits = [
    b for b in response.content if b.type == "bash_code_execution_tool_result"
]
print(f"current parser (bash_code_execution_tool_result): {len(current_hits)} block(s)")

for block in current_hits:
    result = block.content
    if result.type == "bash_code_execution_result":
        print(f"\nstdout:\n{result.stdout.rstrip()}")

print(
    "\nThe legacy parser does not raise. It finds nothing, and a program built\n"
    "on it silently reports no output. That is the failure mode to watch for."
)
