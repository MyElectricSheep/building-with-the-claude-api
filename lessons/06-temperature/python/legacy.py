"""Lesson 6 - the Academy call, preserved.

LEGACY / DEPRECATED. This does not work on current models and is here only to
show you exactly how it fails.

On the Python SDK v1.0+ `temperature` was removed from the method signature, so
this raises TypeError before any HTTP request is made. That is why the failure
looks like a Python bug rather than an API deprecation.

    uv run lesson 06 legacy
"""

import anthropic

client = anthropic.Anthropic()

print("Calling messages.create(..., temperature=0.2) on the current Python SDK...\n")

try:
    message = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=100,
        temperature=0.2,  # LEGACY: removed from the SDK signature
        messages=[{"role": "user", "content": "Name a colour."}],
    )
    print("Unexpected success:", message.stop_reason)
except TypeError as error:
    print(f"TypeError (raised locally, no request sent): {error}")
    print(
        "\nThis is the current behaviour. `temperature`, `top_p` and `top_k` are\n"
        "deprecated as of Claude Opus 4.7; the Python SDK v1 removed them outright.\n"
        "See example.py for the prompting-based replacement."
    )
except anthropic.BadRequestError as error:
    # Reachable on an SDK version that still forwards the parameter.
    print(f"400 from the API: {error.message}")
