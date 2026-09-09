"""Lesson 49 - Project setup: which MCP SDK do you actually have?

A doctor. Reports the installed generation, checks the imports that differ
between v1 and v2, and prints the dependency line for either route.

No API key, no network.

    uv run lesson 49
"""

from __future__ import annotations

import importlib
import importlib.metadata


def check_import(module: str, attribute: str | None = None) -> tuple[bool, str]:
    try:
        loaded = importlib.import_module(module)
    except ModuleNotFoundError as error:
        return False, str(error).split(".", 1)[0][:70]
    if attribute and not hasattr(loaded, attribute):
        return False, f"{module} has no attribute {attribute}"
    return True, "ok"


def main() -> None:
    try:
        version = importlib.metadata.version("mcp")
    except importlib.metadata.PackageNotFoundError:
        print("The `mcp` package is not installed. Run: uv sync --all-extras")
        return

    generation = 2 if version.split(".")[0] >= "2" else 1
    print(f"mcp version:  {version}   (SDK v{generation})\n")

    print("import checks")
    checks = [
        ("mcp.server.mcpserver", "MCPServer", "v2 server class"),
        ("mcp.server.fastmcp", "FastMCP", "v1 server class (removed in v2)"),
        ("mcp", "Client", "v2 high-level client"),
        ("mcp", "ClientSession", "low-level session (both generations)"),
        ("mcp", "MCPError", "v2 error class"),
        ("httpx2", None, "v2 HTTP library (v1 used httpx)"),
    ]
    for module, attribute, label in checks:
        ok, detail = check_import(module, attribute)
        mark = "yes" if ok else "no "
        print(f"  [{mark}] {label:<38} {'' if ok else detail}")

    print()
    if generation >= 2:
        print("You are on v2, which is what this repository targets.")
        print("The Academy's lessons 50-56 will fail at import with:")
        print("  ModuleNotFoundError: No module named 'mcp.server.fastmcp'")
        print("That is expected. See lesson 50 for the rename.\n")
        print("dependency line:")
        print('  dependencies = ["mcp[cli]>=2,<3"]')
    else:
        print("You are on v1, which reproduces the Academy course exactly.")
        print("This repository's MCP lessons target v2 and will not run here.\n")
        print("dependency line to migrate:")
        print('  dependencies = ["mcp[cli]>=2,<3"]')

    print(
        "\nOther v2 changes that leak into your code:\n"
        "  httpx -> httpx2          catch httpx2 exceptions, not httpx\n"
        "  isError -> is_error      all model fields are snake_case now\n"
        "  inputSchema -> input_schema   (wire format unchanged; use\n"
        "                                 model_dump(by_alias=True) to serialise)\n"
        "  McpError -> MCPError\n"
        "  WebSocket transport      removed outright\n\n"
        "The TypeScript SDK went through no equivalent rename - it has always\n"
        "exported McpServer."
    )


if __name__ == "__main__":
    main()
