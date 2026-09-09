"""Lesson 54 - Accessing resources from the client side.

The correction with teeth: a read returns `contents`, a LIST, and each entry is
{uri, text} OR {uri, blob}. The Academy's example assumes one text block.

    uv run lesson 54
    uv run lesson 54 -- --no-claude
"""

from __future__ import annotations

import argparse
import asyncio

from course.blocks import text_of
from course.config import MODEL, create_client
from course.mcp_documents import mcp
from mcp import Client

QUESTION = "What is the on-call handover time, and what is the SEV1 rule?"


async def discover(client: Client) -> list[tuple[str, str]]:
    """Return (uri, text) for every readable TEXT resource."""
    readable: list[tuple[str, str]] = []

    print("concrete resources")
    uris = [str(r.uri) for r in (await client.list_resources()).resources]
    for uri in uris:
        print(f"  {uri}")

    print("\ntemplates (a SEPARATE call - list_resources never shows these)")
    templates = (await client.list_resource_templates()).resource_templates
    for template in templates:
        print(f"  {template.uri_template}")
    # Expand one template per known document.
    uris += [f"docs://documents/{doc_id}" for doc_id in ("deploy.md", "oncall.md")]

    print("\nreading each one, without assuming its shape")
    for uri in uris:
        result = await client.read_resource(uri)
        print(f"  {uri}")
        print(f"    {len(result.contents)} content block(s)")
        for index, content in enumerate(result.contents):
            text = getattr(content, "text", None)
            if isinstance(text, str):
                preview = " ".join(text.split())[:44]
                print(f"    [{index}] {content.mime_type}  text  {preview}...")
                readable.append((uri, text))
            else:
                # The branch the Academy example does not have. In Python this
                # is the silent one: content.text is None, not an error.
                blob = getattr(content, "blob", "") or ""
                print(
                    f"    [{index}] {content.mime_type}  blob  "
                    f"{len(blob)} base64 chars - NOT text"
                )
    return readable


async def ask_claude(readable: list[tuple[str, str]]) -> None:
    print("\n=== injecting the resources into a prompt ===")
    anthropic = create_client()

    # This is what "the application decides what to include" looks like: the
    # app chose these, the model did not ask for them.
    content = [
        {
            "type": "document",
            "source": {"type": "text", "media_type": "text/plain", "data": text},
            "title": uri,
            "citations": {"enabled": True},
        }
        for uri, text in readable
    ]
    content.append({"type": "text", "text": QUESTION})

    response = anthropic.messages.create(
        model=MODEL,
        max_tokens=600,
        system="Answer from the supplied documents and cite them.",
        messages=[{"role": "user", "content": content}],
    )
    print(text_of(response).strip())

    cited = {
        getattr(citation, "document_title", "?")
        for block in response.content
        if block.type == "text"
        for citation in (getattr(block, "citations", None) or [])
    }
    print(f"\ncited: {', '.join(sorted(cited)) if cited else '(none)'}")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-claude", action="store_true")
    args = parser.parse_args()

    async with Client(mcp) as client:
        readable = await discover(client)

    print(
        "\nNever assume one text block. A resource can return several parts,\n"
        "zero parts, or binary data with no `text` at all - and in Python that\n"
        "last one gives you None rather than an error."
    )

    if args.no_claude:
        print("\n--no-claude: skipping the Claude half.")
        return
    await ask_claude(readable)


if __name__ == "__main__":
    asyncio.run(main())
