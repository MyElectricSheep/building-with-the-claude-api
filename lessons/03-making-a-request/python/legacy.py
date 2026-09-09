"""Lesson 3 - the Academy pattern, preserved for comparison.

LEGACY. Do not copy this into new code.

Two problems, both of which this file demonstrates rather than hides:

1. `claude-sonnet-4-5` is a generation behind the current lineup.
2. `message.content[0].text` assumes the first block is text. On a model with
   adaptive thinking enabled, the first block is frequently a `thinking` block,
   and this raises AttributeError - or, worse, silently prints the wrong thing.

Run it to see the failure mode for yourself:

    uv run lesson 03 legacy
"""

import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-sonnet-4-5",  # LEGACY: superseded by claude-sonnet-5
    max_tokens=1000,
    messages=[
        {
            "role": "user",
            "content": "What is quantum computing? Answer in one sentence.",
        }
    ],
)

print("block types:", [block.type for block in message.content])

# LEGACY: positional access. See example.py for the current pattern.
print(message.content[0].text)
