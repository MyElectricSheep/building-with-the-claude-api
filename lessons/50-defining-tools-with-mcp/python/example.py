"""Lesson 50 - Defining tools with MCP, on SDK v2.

The decorators are unchanged from v1. The import is not.

    uv run lesson 50
"""

from __future__ import annotations

import asyncio
import json

from course.mcp_documents import mcp
from mcp import Client


async def main() -> None:
    print("server built with:")
    print("  from mcp.server.mcpserver import MCPServer")
    print('  mcp = MCPServer("DocumentMCP")')
    print("  @mcp.tool()   <- unchanged from v1\n")

    async with Client(mcp) as client:
        tools = (await client.list_tools()).tools
        for tool in tools:
            # v2 field names are snake_case: input_schema, not inputSchema.
            print(f"{tool.name}")
            print(f"  description: {(tool.description or '').splitlines()[0]}")
            print(f"  schema:      {json.dumps(tool.input_schema)}")
        print()

        print("calling them")
        listed = await client.call_tool("list_documents", {})
        # A tool returning list[str] produces one content block PER ITEM.
        # Never assume a single block - the same correction as lesson 54.
        ids = [block.text for block in listed.content if block.type == "text"]
        print(f"  list_documents() -> {ids}")

        read = await client.call_tool("read_document", {"doc_id": "deploy.md"})
        print(f"  read_document('deploy.md') -> {read.content[0].text[:60]}...")

        edited = await client.call_tool(
            "edit_document",
            {
                "doc_id": "deploy.md",
                "old_text": "90 seconds",
                "new_text": "two minutes",
            },
        )
        print(f"  edit_document(...) -> {edited.content[0].text}")

        print("\nerror paths - a tool error is a RESULT, not a protocol failure")
        for tool_name, arguments, label in (
            ("read_document", {"doc_id": "nope.md"}, "unknown document"),
            ("read_document", {}, "missing required argument"),
            ("no_such_tool", {}, "hallucinated tool name"),
        ):
            try:
                result = await client.call_tool(tool_name, arguments)
                marker = "is_error" if result.is_error else "ok"
                text = result.content[0].text if result.content else ""
                print(f"  {label:<26} {marker}: {text[:60]}")
            except Exception as error:  # noqa: BLE001
                print(f"  {label:<26} raised {type(error).__name__}: {error}")

        broken = await client.call_tool(
            "edit_document",
            {"doc_id": "oncall.md", "old_text": "not present", "new_text": "x"},
        )
        print(
            f"  {'no match for old_text':<26} "
            f"{'is_error' if broken.is_error else 'ok'}: {broken.content[0].text[:60]}"
        )

    print(
        "\nThe Python decorator turns a raised ValueError into a tool error\n"
        "result for you. The TypeScript server returns {isError: true, ...}\n"
        "explicitly. Either way the model sees something it can react to,\n"
        "rather than the connection failing."
    )


if __name__ == "__main__":
    asyncio.run(main())
