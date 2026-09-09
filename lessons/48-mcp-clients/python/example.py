"""Lesson 48 - MCP clients and transports.

The same server reached three ways: in-process, stdio, and Streamable HTTP.
WebSockets are not on the list - they were never in the spec and v2 removed the
dependency.

    uv run lesson 48
"""

from __future__ import annotations

import asyncio
import socket
import subprocess
import sys
import time

from course.config import REPO_ROOT
from course.mcp_documents import mcp
from mcp import Client, StdioServerParameters

SERVER_SCRIPT = REPO_ROOT / "shared" / "mcp" / "document_server.py"


async def exercise(client: Client) -> None:
    started = time.monotonic()
    tools = await client.list_tools()
    result = await client.call_tool("read_document", {"doc_id": "oncall.md"})
    elapsed = (time.monotonic() - started) * 1000
    print(f"  protocol:   {client.protocol_version}")
    print(f"  tools:      {len(tools.tools)}")
    print(f"  call:       {result.content[0].text[:52]}...")
    print(f"  round trip: {elapsed:.0f} ms\n")


def free_port() -> int:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return int(probe.getsockname()[1])


def wait_for_port(port: int, timeout: float = 15.0) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        with socket.socket() as probe:
            probe.settimeout(0.3)
            if probe.connect_ex(("127.0.0.1", port)) == 0:
                return True
        time.sleep(0.2)
    return False


async def main() -> None:
    print("1. in-process - no transport at all")
    print("   (v2's Client accepts an MCPServer; this is how you test a server)")
    async with Client(mcp) as client:
        await exercise(client)

    print("2. stdio - a real subprocess, for a LOCAL server")
    parameters = StdioServerParameters(
        # sys.executable is the interpreter already running, so no resolution
        # cost. In a real config this is usually `uv run main.py`.
        command=sys.executable,
        args=[str(SERVER_SCRIPT)],
        cwd=str(REPO_ROOT),
    )
    async with Client(parameters) as client:
        await exercise(client)
    print(
        "   Protocol traffic goes on stdout; diagnostics on stderr. A stray\n"
        "   print() in a stdio server corrupts the JSON-RPC stream.\n"
    )

    print("3. Streamable HTTP - for a REMOTE server")
    port = free_port()
    process = subprocess.Popen(  # noqa: S603
        [
            sys.executable,
            str(SERVER_SCRIPT),
            "--transport",
            "http",
            "--port",
            str(port),
        ],
        cwd=str(REPO_ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        if not wait_for_port(port):
            print("   the local HTTP server did not start in time\n")
        else:
            async with Client(f"http://127.0.0.1:{port}/mcp") as client:
                await exercise(client)
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()

    print(
        "Note what is NOT here: WebSockets. They were never part of the MCP\n"
        "specification, and SDK v2 removed the `ws` extra and the websockets\n"
        "dependency. Streamable HTTP superseded the older HTTP+SSE transport -\n"
        "though Streamable HTTP can itself use SSE, so 'SSE is gone' would be\n"
        "inaccurate.\n\n"
        "In v2, transport keywords moved from the constructor to run():\n"
        "  v1: FastMCP('Demo', port=9000).run(transport='streamable-http')\n"
        "  v2: MCPServer('Demo').run(transport='streamable-http', port=9000)"
    )


if __name__ == "__main__":
    asyncio.run(main())
