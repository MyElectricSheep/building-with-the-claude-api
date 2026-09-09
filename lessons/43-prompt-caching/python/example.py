"""Lesson 43 - Prompt caching.

Watch a cache write on request 1 become reads on 2 and 3 - then watch a
timestamp in the system prompt destroy it. Sending cache_control is not
evidence of a cache hit; usage is.

    uv run lesson 43
"""

from __future__ import annotations

import datetime

from course.blocks import text_of
from course.config import MODEL, create_client
from course.corpus import load_corpus

QUESTIONS = [
    "What is the deadline for an incident retrospective?",
    "How much can I spend on dinner while travelling, without approval?",
    "When does the on-call handover happen?",
]


def big_system_prompt() -> str:
    """Large enough to clear the minimum cacheable prefix (1024-4096 tokens,
    model dependent). A short system prompt silently does not cache."""
    corpus = "\n\n".join(f"# {doc.name}\n{doc.text}" for doc in load_corpus())
    # Repeat to comfortably exceed the threshold on any current model.
    body = (corpus + "\n\n") * 4
    return (
        "You are an internal handbook assistant. Answer only from the handbook "
        "below, in one sentence.\n\n<handbook>\n" + body + "</handbook>"
    )


def run(client, system: str, label: str) -> None:  # noqa: ANN001
    print(f"--- {label} ---")
    for index, question in enumerate(QUESTIONS, start=1):
        response = client.messages.create(
            model=MODEL,
            max_tokens=200,
            # One line. Claude places the breakpoint at the last cacheable
            # block and moves it forward as the conversation grows.
            cache_control={"type": "ephemeral"},
            system=system,
            messages=[{"role": "user", "content": question}],
        )
        usage = response.usage
        print(
            f"  {index}. write {usage.cache_creation_input_tokens or 0:>6}  "
            f"read {usage.cache_read_input_tokens or 0:>6}  "
            f"uncached {usage.input_tokens:>5}   "
            f"{text_of(response).strip()[:52]}"
        )
    print()


def main() -> None:
    client = create_client()
    system = big_system_prompt()
    approx_tokens = client.messages.count_tokens(
        model=MODEL,
        system=system,
        messages=[{"role": "user", "content": "x"}],
    ).input_tokens
    print(f"system prompt: ~{approx_tokens} tokens\n")

    run(client, system, "stable prefix")

    # The single most common silent invalidator. Nothing errors; the cache just
    # never hits, and the bill never goes down.
    def with_timestamp() -> str:
        now = datetime.datetime.now(datetime.UTC).isoformat()
        return f"Current time: {now}\n\n{system}"

    print("--- the same requests, with a timestamp in the system prompt ---")
    for index, question in enumerate(QUESTIONS, start=1):
        response = client.messages.create(
            model=MODEL,
            max_tokens=200,
            cache_control={"type": "ephemeral"},
            system=with_timestamp(),
            messages=[{"role": "user", "content": question}],
        )
        usage = response.usage
        print(
            f"  {index}. write {usage.cache_creation_input_tokens or 0:>6}  "
            f"read {usage.cache_read_input_tokens or 0:>6}  "
            f"uncached {usage.input_tokens:>5}"
        )

    print(
        "\nRender order is tools -> system -> messages, and caching is a PREFIX\n"
        "match: one changed byte early invalidates everything after it. A\n"
        "datetime, a UUID, or a tool list built from an unordered set will all\n"
        "do this. Nothing errors - cache_read_input_tokens just stays at 0."
    )


if __name__ == "__main__":
    main()
