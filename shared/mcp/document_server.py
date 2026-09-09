"""Entry point for the document MCP server (lessons 48-56, 60).

    uv run shared/mcp/document_server.py                     # stdio (default)
    uv run shared/mcp/document_server.py --transport http --port 8931

Keep protocol traffic on stdout and diagnostics on stderr - a print() to stdout
in a stdio server corrupts the JSON-RPC stream.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "python"))

from course.mcp_documents import mcp  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--transport", choices=["stdio", "http"], default="stdio")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8931)
    args = parser.parse_args()

    if args.transport == "stdio":
        # In v2, transport keywords live on run(), not the constructor.
        mcp.run(transport="stdio")
    else:
        print(f"DocumentMCP on http://{args.host}:{args.port}/mcp", file=sys.stderr)
        mcp.run(transport="streamable-http", host=args.host, port=args.port)


if __name__ == "__main__":
    main()
