"""Lesson 51 - A terminal server inspector.

`mcp dev` opens the browser Inspector. This does the same walk in a terminal,
and unlike the Inspector it can be committed as a test.

    uv run lesson 51
"""

from __future__ import annotations

import asyncio

from course.mcp_documents import mcp
from mcp import Client

SAMPLE_ARGUMENTS: dict[str, dict] = {
    "read_document": {"doc_id": "oncall.md"},
    "list_documents": {},
    "edit_document": {
        "doc_id": "oncall.md",
        "old_text": "15 minutes",
        "new_text": "ten minutes",
    },
}


async def main() -> None:
    problems: list[str] = []

    async with Client(mcp) as client:
        print("TOOLS")
        for tool in (await client.list_tools()).tools:
            description = (tool.description or "").strip()
            if not description:
                problems.append(f"tool {tool.name} has no description")
            arguments = SAMPLE_ARGUMENTS.get(tool.name)
            if arguments is None:
                print(f"  {tool.name:<16} (no sample arguments, not called)")
                continue
            result = await client.call_tool(tool.name, arguments)
            text = result.content[0].text if result.content else ""
            marker = "ERROR" if result.is_error else "ok"
            print(f"  {tool.name:<16} [{marker}] {text[:56]}")
            if result.is_error:
                problems.append(f"tool {tool.name} failed on plausible arguments")

        print("\nRESOURCES")
        for resource in (await client.list_resources()).resources:
            result = await client.read_resource(str(resource.uri))
            print(f"  {str(resource.uri):<28} {len(result.contents)} content block(s)")

        print("\nRESOURCE TEMPLATES")
        for template in (await client.list_resource_templates()).resource_templates:
            expanded = template.uri_template.replace("{doc_id}", "deploy.md")
            try:
                result = await client.read_resource(expanded)
                print(f"  {expanded:<28} {len(result.contents)} content block(s)")
            except Exception as error:  # noqa: BLE001
                print(f"  {expanded:<28} FAILED: {error}")
                problems.append(f"template {template.uri_template} did not expand")

        print("\nPROMPTS")
        for prompt in (await client.list_prompts()).prompts:
            arguments = {
                argument.name: "oncall.md" for argument in prompt.arguments or []
            }
            try:
                rendered = await client.get_prompt(prompt.name, arguments)
                first = rendered.messages[0]
                print(
                    f"  /{prompt.name:<20} {len(rendered.messages)} message(s), "
                    f"{first.role}: {first.content.text[:40]}..."
                )
            except Exception as error:  # noqa: BLE001
                print(f"  /{prompt.name:<20} FAILED: {error}")
                problems.append(f"prompt {prompt.name} did not render")

    print("\n=== verdict ===")
    if problems:
        for problem in problems:
            print(f"  [problem] {problem}")
    else:
        print("  every tool, resource, template and prompt responded")

    print(
        "\nFor the browser Inspector:\n"
        "  uv run mcp dev shared/mcp/document_server.py\n\n"
        "The v2 CLI also has `mcp run`, `mcp install` and `mcp version`.\n"
        "Whatever you use, the server has to IMPORT first - an Academy-era\n"
        "FastMCP server fails before the Inspector ever sees it (lesson 50)."
    )


if __name__ == "__main__":
    asyncio.run(main())
