"""Lesson 55 - the Academy's v1 prompt helper import, preserved.

LEGACY / REMOVED. This one catches people twice: they fix the FastMCP import in
lesson 50 and then forget that the PROMPT helpers lived in a submodule of the
same removed package.

    uv run lesson 55 legacy
"""

print("Attempting the v1 prompt-helper import:\n")
print("    from mcp.server.fastmcp.prompts import base\n")

try:
    from mcp.server.fastmcp.prompts import base  # noqa: F401

    print("Imported successfully - you are on MCP Python SDK v1.")
    print("This repository targets v2. See lesson 49.")
except ModuleNotFoundError as error:
    print(f"ModuleNotFoundError: {error}\n")
    print("In v2 the simplest prompt needs NO helper import:\n")
    print("    from mcp.server.mcpserver import MCPServer")
    print("")
    print("    @mcp.prompt()")
    print("    def summarise_document(doc_id: str) -> str:")
    print('        """A reusable prompt for summarising one document."""')
    print("        return f\"Read '{doc_id}' and summarise it in two sentences.\"")
    print(
        "\nThe decorator did not change. Only the package the helpers lived in\n"
        "was removed. See example.py."
    )
