"""Lesson 60 - Wiring this repository's MCP server into Claude Code.

Generates the exact `claude mcp add` command and the exact .mcp.json, with paths
resolved, so you copy one line rather than reconstruct it.

No API key, no network.

    uv run lesson 60
    uv run lesson 60 -- --write
"""

from __future__ import annotations

import argparse
import json
import shutil

from course.config import REPO_ROOT

MCP_JSON = REPO_ROOT / ".mcp.json"

SERVERS = {
    "documents-py": {
        "command": "uv",
        "args": ["run", "shared/mcp/document_server.py"],
    },
    "documents-ts": {
        "command": "node",
        "args": ["shared/mcp/document-server.ts"],
    },
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()

    print(f"repository root: {REPO_ROOT}\n")
    print("=== the command, modernized ===\n")
    print("Academy (ambiguous - is `uv` the command or the transport?):")
    print("  claude mcp add documents uv run main.py\n")
    print("Current (explicit transport, `--` separates the server's command):")
    for name, server in SERVERS.items():
        command = " ".join([server["command"], *server["args"]])
        print(f"  claude mcp add --transport stdio {name} -- {command}")

    print("\n=== scopes ===")
    print("  -s local    (default) just you, this project")
    print("  -s project  written to .mcp.json and committed - shared with the team")
    print("  -s user     all your projects")

    print("\n=== the equivalent .mcp.json ===")
    config = {"mcpServers": SERVERS}
    rendered = json.dumps(config, indent=2)
    print(rendered)

    if args.write:
        MCP_JSON.write_text(rendered + "\n", encoding="utf-8")
        print(f"\nwrote {MCP_JSON.relative_to(REPO_ROOT)}")
    else:
        print("\n(pass --write to write it into the repository)")

    print("\n=== is Claude Code installed here? ===")
    binary = shutil.which("claude")
    if binary:
        print(f"  yes: {binary}")
        print("  try:  claude mcp list")
    else:
        print("  not found on PATH. See lesson 58 for the native installer.")

    print(
        "\nInside a session, `/mcp` lists connected servers, and the server's\n"
        "prompts (lesson 55) appear as slash commands.\n\n"
        "Note the other direction too: the MCP connector lets the Messages API\n"
        "reach a REMOTE MCP server with no client of your own - but it cannot\n"
        "reach a local stdio server, which is what this lesson configures."
    )


if __name__ == "__main__":
    main()
