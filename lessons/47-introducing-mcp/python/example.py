"""Lesson 47 - Introducing MCP.

Connect to the document server in-process and print what it exposes, with a note
on who controls each primitive.

No API key needed - this never calls Claude.

    uv run lesson 47
"""

from __future__ import annotations

import asyncio

from course.mcp_documents import mcp
from mcp import Client


async def main() -> None:
    # v2's high-level Client accepts an MCPServer directly: no subprocess, no
    # transport, no ports. This is how you unit-test an MCP server.
    async with Client(mcp) as client:
        info = client.server_info
        print(f"server: {info.name} v{info.version}\n")

        print("TOOLS - the MODEL decides when to call these")
        for tool in (await client.list_tools()).tools:
            # v2 field names are snake_case: input_schema, not inputSchema.
            required = tool.input_schema.get("required", [])
            print(f"  {tool.name}({', '.join(required)})")
            print(f"    {(tool.description or '').splitlines()[0]}")

        print("\nRESOURCES - the APPLICATION chooses what to include")
        for resource in (await client.list_resources()).resources:
            print(f"  {resource.uri}")
            print(f"    {resource.description or ''}")
        for template in (await client.list_resource_templates()).resource_templates:
            print(f"  {template.uri_template}  (template)")
            print(f"    {template.description or ''}")

        print("\nPROMPTS - a HUMAN invokes these deliberately")
        for prompt in (await client.list_prompts()).prompts:
            args = ", ".join(argument.name for argument in prompt.arguments or [])
            print(f"  /{prompt.name}({args})")
            print(f"    {prompt.description or ''}")

    print(
        "\nThe distinction is the point: a resource is not 'a tool that reads'.\n"
        "A tool is invoked by the model, a resource is fetched by the app, and a\n"
        "prompt is chosen by a person. Lessons 50-56 build each one."
    )


if __name__ == "__main__":
    asyncio.run(main())
