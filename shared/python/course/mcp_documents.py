"""The document MCP server used by lessons 47-56 and 60.

This is the Academy's CLI-project server, translated to **MCP Python SDK v2**.

The one breaking import:

    # v1 (the Academy, and every tutorial written before the v2 release)
    from mcp.server.fastmcp import FastMCP
    mcp = FastMCP("DocumentMCP")

    # v2
    import base64

from mcp.server.mcpserver import MCPServer
    mcp = MCPServer("DocumentMCP")

``mcp.server.fastmcp`` was **removed**, not aliased - importing it raises
ModuleNotFoundError with a message pointing here. The decorators below are
unchanged from v1.

Kept importable rather than script-only so a client can connect to it
in-process, with no subprocess and no transport, which is what makes lessons
52-56 testable.
"""

from __future__ import annotations

import base64

from mcp.server.mcpserver import MCPServer

mcp = MCPServer("DocumentMCP")

DOCUMENTS: dict[str, str] = {
    "deploy.md": (
        "Kestrel deploys on merge to main. Rollout is progressive: 5%, 50%, "
        "100%, ten minutes apart. `kestrel rollback <service>` reverts in about "
        "90 seconds. Migrations are NOT reverted by a rollback."
    ),
    "oncall.md": (
        "On-call rotates weekly, handing over Wednesday at 10:00 Europe/Lisbon. "
        "Acknowledge a page within 15 minutes or escalate to the secondary."
    ),
    "incidents.md": (
        "SEV1: product unusable or data at risk, page immediately. "
        "SEV2: a major feature is broken, page during business hours. "
        "SEV3: degraded but usable, next working day. "
        "Retrospective due within five working days, blameless."
    ),
}


@mcp.tool()
def read_document(doc_id: str) -> str:
    """Read a document by its exact id.

    Args:
        doc_id: One of the ids returned by list_documents.
    """
    if doc_id not in DOCUMENTS:
        raise ValueError(f"Unknown document id: {doc_id}")
    return DOCUMENTS[doc_id]


@mcp.tool()
def list_documents() -> list[str]:
    """List every available document id."""
    return sorted(DOCUMENTS)


@mcp.tool()
def edit_document(doc_id: str, old_text: str, new_text: str) -> str:
    """Replace an exact string in a document.

    Args:
        doc_id: One of the ids returned by list_documents.
        old_text: Text to replace. Must appear exactly once.
        new_text: Replacement text.
    """
    if doc_id not in DOCUMENTS:
        raise ValueError(f"Unknown document id: {doc_id}")
    occurrences = DOCUMENTS[doc_id].count(old_text)
    if occurrences == 0:
        raise ValueError("old_text not found in the document")
    if occurrences > 1:
        raise ValueError(f"old_text matched {occurrences} times; it must match once")
    DOCUMENTS[doc_id] = DOCUMENTS[doc_id].replace(old_text, new_text, 1)
    return f"Edited {doc_id}."


@mcp.resource("docs://documents")
def all_documents() -> list[str]:
    """The list of document ids, as a resource rather than a tool call."""
    return sorted(DOCUMENTS)


@mcp.resource("docs://documents/{doc_id}")
def document_resource(doc_id: str) -> str:
    """One document's contents, addressed by URI template."""
    if doc_id not in DOCUMENTS:
        raise ValueError(f"Unknown document id: {doc_id}")
    return DOCUMENTS[doc_id]


@mcp.resource("docs://logo", mime_type="image/png")
def logo_resource() -> bytes:
    """A deliberately BINARY resource, so lesson 54 can exercise the blob branch.

    A resource content block is {uri, text} OR {uri, blob}. Code that assumes
    `text` breaks here - and breaks silently in Python.
    """
    # A 1x1 transparent PNG.
    return base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk"
        "YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    )


@mcp.prompt()
def summarise_document(doc_id: str) -> str:
    """A reusable prompt for summarising one document."""
    return (
        f"Read the document '{doc_id}' with the read_document tool, then "
        "summarise it in exactly two sentences. Name the document id."
    )


@mcp.prompt()
def compare_documents(first: str, second: str) -> str:
    """A reusable prompt for comparing two documents."""
    return (
        f"Read '{first}' and '{second}' with the read_document tool. "
        "List what they agree on and where they could conflict in practice."
    )


def resource_text(result) -> list[str]:  # noqa: ANN001
    """Extract the text from a resource read result.

    A resource content block is ``{uri, text}`` OR ``{uri, blob}`` - never
    assume which, and never assume there is exactly one block. This is the
    lesson-54 correction.
    """
    texts: list[str] = []
    for content in result.contents:
        text = getattr(content, "text", None)
        if isinstance(text, str):
            texts.append(text)
        else:
            blob = getattr(content, "blob", "") or ""
            texts.append(f"[binary blob, {len(blob)} base64 chars]")
    return texts
