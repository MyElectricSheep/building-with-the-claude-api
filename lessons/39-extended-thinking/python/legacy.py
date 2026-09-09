"""Lesson 39 - the Academy's manual thinking budget, preserved.

LEGACY / UNSUPPORTED on current models.

`thinking={"type": "enabled", "budget_tokens": N}` returns HTTP 400 on Sonnet 5,
Opus 5, Opus 4.7/4.8 and the Fable family. It is deprecated-but-working on Opus
4.6 and Sonnet 4.6, and still REQUIRED on Haiku 4.5 and older.

So this is a hard cutover at the 4.7 generation, not a gentle deprecation.

    uv run lesson 39 legacy
"""

import anthropic
from course.config import MODEL

client = anthropic.Anthropic()

print(f'Sending thinking={{"type": "enabled", "budget_tokens": 5000}} to {MODEL}...\n')

try:
    message = client.messages.create(
        model=MODEL,
        max_tokens=8000,
        thinking={"type": "enabled", "budget_tokens": 5000},  # LEGACY
        messages=[{"role": "user", "content": "What is 17 * 243? Show your working."}],
    )
    print(f"Accepted. stop_reason={message.stop_reason}")
    print(
        "\nThis model still accepts budget_tokens - it predates Claude 4.7, or\n"
        "is on the 4.6 generation where the parameter is deprecated but working.\n"
        "Set CLAUDE_MODEL to claude-sonnet-5 to see the 400."
    )
except anthropic.BadRequestError as error:
    print(f"400 from the API: {error.message}")
    print(
        "\nThis is the current behaviour. The replacement is adaptive thinking\n"
        'plus output_config.effort - see example.py.\n\n'
        "  thinking={'type': 'adaptive', 'display': 'summarized'}\n"
        "  output_config={'effort': 'high'}"
    )
