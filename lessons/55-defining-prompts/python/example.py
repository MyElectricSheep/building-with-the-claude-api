"""Lesson 55 - Defining prompts on MCP SDK v2.

The decorator is unchanged. The `mcp.server.fastmcp.prompts` helper import is
gone - and the simplest current form needs no helper at all.

    uv run lesson 55
"""

from __future__ import annotations

import asyncio

from course.mcp_documents import mcp
from mcp import Client


async def main() -> None:
    print("defined with:")
    print("  from mcp.server.mcpserver import MCPServer")
    print("  @mcp.prompt()")
    print("  def summarise_document(doc_id: str) -> str: ...")
    print("  (returning a plain string needs no helper import at all)\n")

    async with Client(mcp) as client:
        print("what a client's slash-command menu would show")
        for prompt in (await client.list_prompts()).prompts:
            arguments = prompt.arguments or []
            signature = ", ".join(
                f"{argument.name}{'' if argument.required else '?'}"
                for argument in arguments
            )
            print(f"  /{prompt.name}({signature})")
            # The docstring IS the menu entry. Write it for a human.
            print(f"    {prompt.description}")
            for argument in arguments:
                print(f"      {argument.name}: required={argument.required}")

        print("\nrendered with real arguments")
        rendered = await client.get_prompt(
            "summarise_document", {"doc_id": "deploy.md"}
        )
        for message in rendered.messages:
            print(f"  [{message.role}] {message.content.text}")

        print()
        rendered = await client.get_prompt(
            "compare_documents", {"first": "deploy.md", "second": "incidents.md"}
        )
        for message in rendered.messages:
            print(f"  [{message.role}] {message.content.text}")

        print("\na missing required argument")
        try:
            await client.get_prompt("summarise_document", {})
            print("  (no error - check the handler)")
        except Exception as error:  # noqa: BLE001
            print(f"  {type(error).__name__}: {str(error)[:80]}")

    print(
        "\nThe SERVER owns the wording. Improve the prompt here and every client\n"
        "that uses it improves, with no client change. That is the argument for\n"
        "a prompt over a hardcoded string in each application.\n\n"
        "And a prompt is not a tool: if the MODEL should decide when to run it,\n"
        "it is a tool. A prompt is for when a PERSON decides."
    )


if __name__ == "__main__":
    asyncio.run(main())
