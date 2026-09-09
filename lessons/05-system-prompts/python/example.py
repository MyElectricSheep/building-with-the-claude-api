"""Lesson 5 - System prompts.

`system` is a top-level parameter, not a message. Same question, two system
prompts, visibly different answers - then the block form used for caching.

    uv run lesson 05
"""

from __future__ import annotations

from course.blocks import text_of
from course.config import MODEL, create_client

QUESTION = "How should I store user passwords?"

PERSONAS = {
    "terse security reviewer": (
        "You are a security reviewer. Answer in at most two sentences. "
        "State the recommendation and the single most important pitfall. "
        "No preamble."
    ),
    "patient teacher": (
        "You are teaching a developer who has never shipped authentication. "
        "Explain the reasoning before the recommendation, in about four sentences."
    ),
}


def main() -> None:
    client = create_client()

    for label, system in PERSONAS.items():
        response = client.messages.create(
            model=MODEL,
            max_tokens=400,
            system=system,
            messages=[{"role": "user", "content": QUESTION}],
        )
        print(f"--- {label} ---")
        print(text_of(response))
        print()

    # The block form. Identical semantics; this is what lesson 43 attaches a
    # cache breakpoint to.
    response = client.messages.create(
        model=MODEL,
        max_tokens=200,
        system=[
            {
                "type": "text",
                "text": PERSONAS["terse security reviewer"],
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": QUESTION}],
    )
    print("--- same prompt, block form with a cache breakpoint ---")
    print(text_of(response))
    print(
        f"\ncache write: {response.usage.cache_creation_input_tokens} tokens"
        f" | cache read: {response.usage.cache_read_input_tokens} tokens"
    )
    print(
        "A short system prompt like this is usually below the model's minimum "
        "cacheable prefix, so expect both counters to be 0. Lesson 43 uses a "
        "prompt large enough to actually cache."
    )


if __name__ == "__main__":
    main()
