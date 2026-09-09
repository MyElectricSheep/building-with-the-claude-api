"""Lesson 31 - The web search tool.

A SERVER tool: Anthropic runs it, you never return a tool_result. The Academy's
version still works; newer ones add dynamic filtering and response inclusion.

    uv run lesson 31
"""

from __future__ import annotations

from typing import Any

from course.blocks import block_types, format_usage, text_of
from course.config import MODEL, create_client

QUESTION = "In two sentences, what is the Model Context Protocol used for?"

VARIANTS = [
    ("web_search_20250305 (the Academy version)", "web_search_20250305"),
    (
        "web_search_20260318 (dynamic filtering + response inclusion)",
        "web_search_20260318",
    ),
]


def show_citations(response) -> None:  # noqa: ANN001
    seen: set[str] = set()
    for block in response.content:
        if block.type != "text":
            continue
        for citation in getattr(block, "citations", None) or []:
            url = getattr(citation, "url", None)
            if url and url not in seen:
                seen.add(url)
                print(f"    - {getattr(citation, 'title', '(untitled)')}  {url}")
    if not seen:
        print("    (none)")


def run(client, label: str, tool_type: str) -> None:  # noqa: ANN001
    print(f"--- {label} ---")

    tool: dict[str, Any] = {"type": tool_type, "name": "web_search", "max_uses": 2}
    # Do NOT also declare code_execution here: on _20260209 and later the API
    # provisions the sandbox for dynamic filtering itself, and a second
    # execution environment confuses the model.

    messages: list[dict[str, Any]] = [{"role": "user", "content": QUESTION}]

    for _ in range(4):
        response = client.messages.create(
            model=MODEL, max_tokens=2000, tools=[tool], messages=messages
        )

        # A long search turn can pause. Send the assistant turn back unchanged
        # to continue - encrypted_content must survive verbatim.
        if response.stop_reason == "pause_turn":
            print("  pause_turn - resuming")
            messages.append({"role": "assistant", "content": response.content})
            continue
        break

    print(f"  blocks:   {block_types(response)}")

    searches = 0
    server_tool_use = getattr(response.usage, "server_tool_use", None)
    if server_tool_use is not None:
        searches = getattr(server_tool_use, "web_search_requests", 0) or 0
    print(f"  searches: {searches}")
    print(f"  usage:    {format_usage(response.usage)}")

    # Server-tool errors arrive as HTTP 200 with an error OBJECT where a LIST of
    # results would be. Branch on that before indexing.
    for block in response.content:
        is_search_result = block.type == "web_search_tool_result"
        if is_search_result and not isinstance(block.content, list):
            code = getattr(block.content, "error_code", "unknown")
            print(f"  search error (still a 200): {code}")

    print("  citations:")
    show_citations(response)
    print(f"\n  {text_of(response).strip()[:400]}\n")


def main() -> None:
    client = create_client()
    for label, tool_type in VARIANTS:
        run(client, label, tool_type)

    print(
        "Compare the input token counts. Dynamic filtering (20260209 and later)\n"
        "runs code that filters results before they enter the context window, so\n"
        "a search-heavy request costs less. That is the reason to move versions -\n"
        "not that the old one stopped working."
    )


if __name__ == "__main__":
    main()
