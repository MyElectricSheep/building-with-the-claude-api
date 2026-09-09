"""Lesson 56 - Prompts in the client.

The loop this module has been building: the user picks a prompt, the SERVER
renders it, the client converts it, and the model uses the server's tools.

    uv run lesson 56
    uv run lesson 56 -- --no-claude
"""

from __future__ import annotations

import argparse
import asyncio
import json
from typing import Any

from course.blocks import append_assistant_turn, text_of, tool_uses
from course.config import MODEL, create_client
from course.mcp_documents import mcp
from mcp import Client


def to_anthropic_messages(rendered) -> list[dict[str, Any]]:  # noqa: ANN001
    """Convert MCP prompt messages to Anthropic message params.

    They look alike, which is exactly why this conversion gets skipped. A
    message's content can be text, an image, or an embedded resource - do not
    assume text, and do not stringify a resource.
    """
    messages: list[dict[str, Any]] = []
    for message in rendered.messages:
        content = message.content
        kind = getattr(content, "type", None)
        if kind == "text":
            messages.append({"role": message.role, "content": content.text})
        elif kind == "resource":
            # Promote an embedded resource to a document block rather than
            # flattening it into a string.
            resource = content.resource
            messages.append(
                {
                    "role": message.role,
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "text",
                                "media_type": "text/plain",
                                "data": getattr(resource, "text", ""),
                            },
                            "title": str(getattr(resource, "uri", "resource")),
                        }
                    ],
                }
            )
        else:
            messages.append(
                {"role": message.role, "content": f"[unsupported block: {kind}]"}
            )
    return messages


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-claude", action="store_true")
    args = parser.parse_args()

    async with Client(mcp) as mcp_client:
        print("=== the menu a user would see ===")
        for prompt in (await mcp_client.list_prompts()).prompts:
            names = ", ".join(a.name for a in prompt.arguments or [])
            print(f"  /{prompt.name}({names})  -  {prompt.description}")

        print("\n=== user picks /summarise_document doc_id=incidents.md ===")
        rendered = await mcp_client.get_prompt(
            "summarise_document", {"doc_id": "incidents.md"}
        )
        print(f"  the server rendered {len(rendered.messages)} message(s):")
        for message in rendered.messages:
            print(f"    [{message.role}] {message.content.text}")

        messages = to_anthropic_messages(rendered)
        print(f"\n  converted to {len(messages)} Anthropic message param(s)")

        if args.no_claude:
            print("\n--no-claude: skipping the Claude half.")
            return

        print("\n=== running it, with the server's tools available ===")
        anthropic = create_client()
        mcp_tools = (await mcp_client.list_tools()).tools
        tools = [
            {
                "name": tool.name,
                "description": tool.description or "",
                "input_schema": tool.input_schema,
            }
            for tool in mcp_tools
        ]

        for turn in range(1, 7):
            response = anthropic.messages.create(
                model=MODEL, max_tokens=1200, tools=tools, messages=messages
            )
            append_assistant_turn(messages, response)

            calls = tool_uses(response)
            if not calls:
                print(f"\n  turn {turn}: done\n")
                print(text_of(response))
                break

            results = []
            for call in calls:
                print(f"  turn {turn}: {call.name}({json.dumps(call.input)})")
                outcome = await mcp_client.call_tool(call.name, dict(call.input))
                text = "\n".join(
                    block.text for block in outcome.content if block.type == "text"
                )
                results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": call.id,
                        "content": text,
                        "is_error": bool(outcome.is_error),
                    }
                )
            messages.append({"role": "user", "content": results})
        else:
            print("  turn limit reached")

    print(
        "\nThat is the whole loop: the SERVER supplied both the wording and the\n"
        "tools; the client only supplied the loop. Improve the prompt on the\n"
        "server and every client that uses it improves."
    )


if __name__ == "__main__":
    asyncio.run(main())
