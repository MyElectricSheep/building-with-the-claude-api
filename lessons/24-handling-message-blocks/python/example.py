"""Lesson 24 - Handling message blocks.

The correction that matters most in the whole course: dispatch on block.type.
This sends a request that reliably produces a mixed response and walks it.

    uv run lesson 24
"""

from __future__ import annotations

import json

from course.config import MODEL, create_client
from course.tools import TOOL_DEFINITIONS


def describe(index: int, block) -> None:  # noqa: ANN001
    kind = block.type
    if kind == "thinking":
        summary = (block.thinking or "").strip()
        shown = summary[:100] + "..." if len(summary) > 100 else summary
        shown = shown or "(empty - display is omitted)"
        print(f"  [{index}] thinking            {shown}")
        print("       -> echo this back unchanged in the next request")
    elif kind == "redacted_thinking":
        print(f"  [{index}] redacted_thinking   (opaque)")
        print("       -> echo this back unchanged too")
    elif kind == "text":
        print(f"  [{index}] text                {block.text[:100]!r}")
        print("       -> concatenate with the other text blocks")
    elif kind == "tool_use":
        args = json.dumps(block.input)
        print(f"  [{index}] tool_use            {block.name}({args})")
        print(f"       -> execute it, return a tool_result with id {block.id}")
    elif kind == "server_tool_use":
        print(f"  [{index}] server_tool_use     {block.name}")
        print("       -> nothing; Anthropic already ran it")
    else:
        print(f"  [{index}] {kind}")
        print("       -> a block type this example does not know; check block.type")


def main() -> None:
    client = create_client()

    response = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        tools=TOOL_DEFINITIONS,
        # display defaults to "omitted" on current models: the thinking blocks
        # are there and billed, but their text is empty. Ask for a summary.
        thinking={"type": "adaptive", "display": "summarized"},
        messages=[
            {
                "role": "user",
                "content": (
                    "Remind me to renew the SSO certificate a week from now. "
                    "Think it through before you act."
                ),
            }
        ],
    )

    print(f"stop_reason: {response.stop_reason}")
    print(f"{len(response.content)} blocks\n")
    for index, block in enumerate(response.content):
        describe(index, block)

    print("\n--- what the Academy would have read ---")
    academy_index = 1
    if len(response.content) > academy_index:
        block = response.content[academy_index]
        print(f"  response.content[{academy_index}] is a {block.type} block")
        if block.type != "tool_use":
            print("  -> reading .input or .id off it raises AttributeError")
    else:
        print(f"  response.content[{academy_index}] does not exist -> IndexError")

    tool_indices = [
        index
        for index, block in enumerate(response.content)
        if block.type == "tool_use"
    ]
    print(f"  the tool_use block(s) are actually at index {tool_indices}")
    print("\n  Never index. Filter on block.type.")


if __name__ == "__main__":
    main()
