"""Lesson 52 - Implementing an MCP client.

High-level Client, the low-level ClientSession it replaces, and the bridge that
turns MCP tools into Anthropic tools.

    uv run lesson 52
    uv run lesson 52 -- --no-claude
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from typing import Any

from course.blocks import append_assistant_turn, text_of, tool_uses
from course.config import MODEL, REPO_ROOT, create_client
from mcp import Client, ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

SERVER_SCRIPT = REPO_ROOT / "shared" / "mcp" / "document_server.py"

SERVER = StdioServerParameters(
    command=sys.executable, args=[str(SERVER_SCRIPT)], cwd=str(REPO_ROOT)
)


async def high_level() -> None:
    print("=== high-level Client (v2) ===")
    print("  async with Client(server) as client:")
    print("      tools = await client.list_tools()\n")
    async with Client(SERVER) as client:
        tools = (await client.list_tools()).tools
        print(f"  connected, protocol {client.protocol_version}")
        print(f"  tools: {[tool.name for tool in tools]}")
    print("  Client owns: process startup, transport, negotiation, initialize,")
    print("  shutdown. It also accepts a URL string or an MCPServer instance.\n")


async def low_level() -> None:
    print("=== low-level ClientSession (still supported) ===")
    print("  async with stdio_client(server) as (read, write):")
    print("      async with ClientSession(read, write) as session:")
    print("          await session.initialize()\n")
    # Nested deliberately: this is the Academy's shape, verbatim, so the two
    # blocks can be compared line for line.
    async with stdio_client(SERVER) as (read, write):  # noqa: SIM117
        async with ClientSession(read, write) as session:
            await session.initialize()  # you do this yourself
            tools = (await session.list_tools()).tools
            print(f"  tools: {[tool.name for tool in tools]}")
    print("  Four layers instead of one. Right when you need to own the streams -")
    print("  a custom transport, an unusual lifecycle, protocol instrumentation.\n")


async def bridge_to_claude() -> None:
    print("=== bridging MCP tools to Claude ===")
    anthropic_client = create_client()

    async with Client(SERVER) as mcp_client:
        mcp_tools = (await mcp_client.list_tools()).tools

        # The whole conversion. Namespace the names if you connect several
        # servers - two servers both exposing `search` is a silent collision.
        tools = [
            {
                "name": tool.name,
                "description": tool.description or "",
                "input_schema": tool.input_schema,
            }
            for tool in mcp_tools
        ]
        print(f"  {len(tools)} MCP tool(s) -> Anthropic tool definitions\n")

        messages: list[dict[str, Any]] = [
            {
                "role": "user",
                "content": (
                    "What is the on-call handover time, and what happens if I "
                    "cannot acknowledge a page?"
                ),
            }
        ]

        for turn in range(1, 7):
            response = anthropic_client.messages.create(
                model=MODEL, max_tokens=1500, tools=tools, messages=messages
            )
            append_assistant_turn(messages, response)

            calls = tool_uses(response)
            if not calls:
                print(f"  turn {turn}: done\n")
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
                        # Map the MCP error flag through, so the model can
                        # recover instead of seeing a bare string.
                        "is_error": bool(outcome.is_error),
                    }
                )
            messages.append({"role": "user", "content": results})
        else:
            print("  turn limit reached")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-claude", action="store_true")
    args = parser.parse_args()

    await high_level()
    await low_level()
    if args.no_claude:
        print("--no-claude: skipping the Claude bridge.")
        return
    await bridge_to_claude()


if __name__ == "__main__":
    asyncio.run(main())
