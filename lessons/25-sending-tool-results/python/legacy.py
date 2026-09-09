"""Lesson 25 - the Academy's positional access, preserved.

LEGACY. `response.content[1]` is not reliably the tool call on a current model:
adaptive thinking frequently puts a `thinking` block at index 0 and text at
index 1.

This file prints what index 1 actually is, then attempts the access.

    uv run lesson 25 legacy
"""

import anthropic
from course.config import MODEL
from course.tools import TOOL_DEFINITIONS

client = anthropic.Anthropic()

response = client.messages.create(
    model=MODEL,
    max_tokens=1000,
    tools=TOOL_DEFINITIONS,
    messages=[{"role": "user", "content": "What is the current UTC time?"}],
)

print("blocks:", [block.type for block in response.content])
print()

if len(response.content) > 1:
    print(f"response.content[1] is a {response.content[1].type} block")
else:
    print("response.content has fewer than two blocks - index 1 does not exist")

print()
try:
    # LEGACY: the two lines the Academy teaches.
    tool_input = response.content[1].input
    tool_use_id = response.content[1].id
    print(f"got input={tool_input} id={tool_use_id}")
    print("(this happened to work - the layout was favourable this run)")
except (IndexError, AttributeError) as error:
    print(f"{type(error).__name__}: {error}")

print(
    "\nEven when it works it is luck. See example.py: filter on block.type.\n"
    "TypeScript refuses to compile the equivalent line at all."
)
