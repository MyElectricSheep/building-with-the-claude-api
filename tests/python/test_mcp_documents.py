"""In-process tests for the document MCP server.

No subprocess, no stdio, no ports: MCP Python SDK v2's high-level Client accepts
an MCPServer instance directly. That is what makes an MCP server unit-testable.
"""

import pytest
from course.mcp_documents import mcp
from mcp import Client


@pytest.mark.asyncio
async def test_server_advertises_tools_resources_and_prompts():
    async with Client(mcp) as client:
        tools = await client.list_tools()
        assert sorted(tool.name for tool in tools.tools) == [
            "edit_document",
            "list_documents",
            "read_document",
        ]

        resources = await client.list_resources()
        assert any(str(r.uri) == "docs://documents" for r in resources.resources)

        # v2 uses snake_case for model fields: resource_templates, not
        # resourceTemplates. The JSON wire format is unchanged.
        templates = await client.list_resource_templates()
        assert any(
            t.uri_template == "docs://documents/{doc_id}"
            for t in templates.resource_templates
        )

        prompts = await client.list_prompts()
        assert sorted(p.name for p in prompts.prompts) == [
            "compare_documents",
            "summarise_document",
        ]


@pytest.mark.asyncio
async def test_read_document_returns_content_and_reports_unknown_ids():
    async with Client(mcp) as client:
        ok = await client.call_tool("read_document", {"doc_id": "oncall.md"})
        assert "Wednesday" in ok.content[0].text

        bad = await client.call_tool("read_document", {"doc_id": "nope.md"})
        assert bad.is_error is True


@pytest.mark.asyncio
async def test_edit_document_enforces_exactly_one_match():
    async with Client(mcp) as client:
        missing = await client.call_tool(
            "edit_document",
            {"doc_id": "incidents.md", "old_text": "zzz", "new_text": "x"},
        )
        assert missing.is_error is True

        applied = await client.call_tool(
            "edit_document",
            {
                "doc_id": "incidents.md",
                "old_text": "five working days",
                "new_text": "three working days",
            },
        )
        assert applied.is_error is not True


@pytest.mark.asyncio
async def test_resource_read_returns_a_contents_list():
    async with Client(mcp) as client:
        result = await client.read_resource("docs://documents/deploy.md")
        # Never assume exactly one block - that is the lesson-54 correction.
        assert isinstance(result.contents, list)
        assert len(result.contents) >= 1


@pytest.mark.asyncio
async def test_prompt_renders_to_messages():
    async with Client(mcp) as client:
        prompt = await client.get_prompt("summarise_document", {"doc_id": "oncall.md"})
        assert prompt.messages[0].role == "user"
        assert "oncall.md" in prompt.messages[0].content.text
