"""Lesson 6 - Temperature, replaced by prompting.

There is no randomness parameter any more. Steer with instructions, and get
diversity by issuing independent requests.

    uv run lesson 06
"""

from __future__ import annotations

from course.blocks import text_of
from course.config import MODEL, create_client

QUESTION = "Suggest a name for a command-line tool that formats SQL migrations."

# The replacement for temperature=0.1
CONSERVATIVE = (
    "Respond conservatively. Prioritise the most likely, well-supported answer. "
    "Avoid creative speculation. Give exactly one suggestion and one sentence of "
    "justification."
)

# The replacement for temperature=1.0
EXPLORATORY = (
    "Generate five substantially different possibilities. Explore unusual "
    "approaches and avoid converging on the most obvious answer. One line each, "
    "no justification."
)


def main() -> None:
    client = create_client()

    for label, system in (("conservative", CONSERVATIVE), ("exploratory", EXPLORATORY)):
        response = client.messages.create(
            model=MODEL,
            max_tokens=300,
            system=system,
            messages=[{"role": "user", "content": QUESTION}],
        )
        print(f"--- steered by prompt: {label} ---")
        print(text_of(response))
        print()

    # Sampling diversity, without a sampling parameter: independent requests to
    # the same prompt do not return identical text.
    print("--- three independent requests, same prompt ---")
    for index in range(3):
        response = client.messages.create(
            model=MODEL,
            max_tokens=60,
            system="Answer with a single name and nothing else.",
            messages=[{"role": "user", "content": QUESTION}],
        )
        print(f"  {index + 1}. {text_of(response).strip()}")

    print(
        "\nNote: output_config.effort is NOT the replacement for temperature. "
        "It controls reasoning depth, not randomness."
    )


if __name__ == "__main__":
    main()
