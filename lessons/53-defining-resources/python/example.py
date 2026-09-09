"""Lesson 53 - Defining resources.

Fixed URIs and URI templates. The decorator is unchanged from v1; the server
class is not. Templates are discovered by a SEPARATE call - a client that only
lists resources never sees them.

    uv run lesson 53
"""

from __future__ import annotations

import asyncio

from course.mcp_documents import mcp, resource_text
from mcp import Client


async def main() -> None:
    print("defined with:")
    print('  @mcp.resource("docs://documents")           # fixed URI')
    print('  @mcp.resource("docs://documents/{doc_id}")  # template')
    print("  (unchanged from v1 - only the server class was renamed)\n")

    async with Client(mcp) as client:
        print("list_resources() - concrete URIs")
        for resource in (await client.list_resources()).resources:
            print(f"  {resource.uri}")
            print(f"    name: {resource.name}  mime: {resource.mime_type}")

        # Templates come from a SEPARATE call. A client that only calls
        # list_resources() will never see them.
        print("\nlist_resource_templates() - templates")
        templates = (await client.list_resource_templates()).resource_templates
        for template in templates:
            # v2 field names are snake_case: uri_template, not uriTemplate.
            print(f"  {template.uri_template}")
            print(f"    name: {template.name}")

        print("\nreading a fixed URI")
        result = await client.read_resource("docs://documents")
        # A content block is {uri, text} OR {uri, blob} - resource_text narrows.
        for content, text in zip(result.contents, resource_text(result), strict=True):
            print(f"  {content.uri} ({content.mime_type})")
            print(f"    {' '.join(text.split())}")

        print("\nexpanding a template")
        for doc_id in ("deploy.md", "incidents.md"):
            result = await client.read_resource(f"docs://documents/{doc_id}")
            body = resource_text(result)[0]
            print(f"  docs://documents/{doc_id} -> {body[:56]}...")

        print("\na doc_id that does not exist")
        try:
            await client.read_resource("docs://documents/nope.md")
            print("  (no error - check the handler)")
        except Exception as error:  # noqa: BLE001
            # The SDK also logs the server-side traceback to stderr. That is
            # the server telling you what happened, not a crash in the client.
            print(f"  {type(error).__name__}: {str(error)[:80]}")

    print(
        "\nA resource is not 'a tool that reads'. A tool is called by the MODEL\n"
        "mid-turn; a resource is fetched by the APPLICATION, usually before the\n"
        "turn starts. Lesson 54 uses them.\n\n"
        "And note: a template parameter is untrusted input. If {doc_id} reaches\n"
        "a filesystem, the path guard from lesson 30 applies - MCP does not\n"
        "sanitise it for you."
    )


if __name__ == "__main__":
    asyncio.run(main())
