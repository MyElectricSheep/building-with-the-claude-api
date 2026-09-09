"""Lesson 8 - the Academy's prefill + stop_sequences technique, preserved.

LEGACY / UNSUPPORTED. A final prefilled assistant turn returns HTTP 400 on
Claude Sonnet 5, Opus 5, Opus 4.6/4.7/4.8, Sonnet 4.6 and the Fable family.

Note what is NOT deprecated here:
  * complete prior assistant turns are still fine (that is lesson 4);
  * `stop_sequences` itself is still a supported parameter.

Only the trailing *partial* assistant prefill is gone.

    uv run lesson 08 legacy
"""

import anthropic
from course.config import MODEL

client = anthropic.Anthropic()

messages = [
    {"role": "user", "content": "Generate a very short EventBridge rule as JSON"},
    # LEGACY: the prefill. This is the line that is now rejected.
    {"role": "assistant", "content": "```json"},
]

print(f"Sending a trailing assistant prefill to {MODEL}...\n")

try:
    message = client.messages.create(
        model=MODEL,
        max_tokens=500,
        messages=messages,
        stop_sequences=["```"],
    )
    text = "".join(b.text for b in message.content if b.type == "text")
    print("Unexpected success - this model still accepts prefill:")
    print(text)
    print("\n(Prefill is rejected from Claude 4.6 onward. Set CLAUDE_MODEL to a")
    print("current model to see the 400.)")
except anthropic.BadRequestError as error:
    print(f"400 from the API: {error.message}")
    print(
        "\nThis is the current behaviour. Replace the whole technique with\n"
        "structured outputs - see example.py."
    )
