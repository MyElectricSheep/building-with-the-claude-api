"""Lesson 50 - the Academy's v1 import, preserved.

LEGACY / REMOVED. `mcp.server.fastmcp` does not exist in MCP Python SDK v2. It
was removed, not aliased.

The error is unusually helpful - it names the replacement class and the pin -
so this file simply shows it to you.

    uv run lesson 50 legacy
"""

print("Attempting the v1 import:\n")
print("    from mcp.server.fastmcp import FastMCP\n")

try:
    from mcp.server.fastmcp import FastMCP  # noqa: F401

    print("Imported successfully - you are on MCP Python SDK v1.")
    print("This repository targets v2. See lesson 49 for the dependency lines.")
except ModuleNotFoundError as error:
    print(f"ModuleNotFoundError: {error}\n")
    print("The current import is:\n")
    print("    from mcp.server.mcpserver import MCPServer")
    print('    mcp = MCPServer("DocumentMCP")\n')
    print(
        "Note the module path: `mcp.server.mcpserver`, not `mcp.server`.\n"
        "The decorators below it - @mcp.tool(), @mcp.resource(), @mcp.prompt() -\n"
        "are unchanged from v1. See example.py."
    )
