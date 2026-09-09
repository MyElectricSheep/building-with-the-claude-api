# 48 · MCP clients

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 48, _MCP clients_
>
> **2026 status: 🟠 Client/server model correct, transport discussion outdated**

## What the lesson teaches

The client/server split: a client connects to a server, negotiates protocol version and
capabilities, then lists and calls what the server exposes.

Correct and unchanged.

## What the Academy does

Describes possible transports as **stdio, HTTP, and WebSockets**.

## What changed

### The transport list is wrong now

There are **two** standard transports to learn:

| Where the server runs    | Transport           |
| ------------------------ | ------------------- |
| Locally, as a subprocess | **stdio**           |
| Remotely                 | **Streamable HTTP** |

- **WebSockets were never part of the MCP specification.** The Python SDK v2 removed
  the `ws` extra and the `websockets` dependency entirely.
- **Streamable HTTP superseded the older HTTP+SSE transport.** Note that "SSE is gone"
  would be inaccurate — Streamable HTTP can itself use SSE for the server→client
  direction, and SDKs keep some legacy HTTP+SSE compatibility. What is gone is
  HTTP+SSE as the _thing you should reach for_.

In Python SDK v2 the transport keywords also **moved from the constructor to `run()`**:

```python
# v1
mcp = FastMCP("Demo", json_response=True, port=9000)
mcp.run(transport="streamable-http")

# v2
mcp = MCPServer("Demo")
mcp.run(transport="streamable-http", port=9000, json_response=True)
```

### There is a third option the lesson could not have

For **local** development and testing: connect **in-process**, with no transport at all.
Python v2's `Client` accepts an `MCPServer` instance; the TypeScript SDK has
`InMemoryTransport.createLinkedPair()`. This is how you write tests for an MCP server,
and it is what this repository's MCP tests use.

### One rule for stdio servers

**Protocol traffic goes on stdout; diagnostics go on stderr.** A stray `print()` /
`console.log()` in a stdio server corrupts the JSON-RPC stream and the client fails with
a parse error that points nowhere useful. Use `print(..., file=sys.stderr)` /
`console.error`.

## The current implementation

The same server, reached three ways, with the same three calls made over each:

1. **in-process** — no transport
2. **stdio** — a real subprocess, spawned and torn down
3. **Streamable HTTP** — the server started on a local port, then reached over HTTP

Each prints the negotiated protocol version and the round-trip time, so the cost of each
transport is visible. It also demonstrates the stdout-corruption failure by pointing at
where it would happen.

## Python vs TypeScript

Python: `Client(StdioServerParameters(...))` or `Client("http://...")` — the high-level
`Client` picks the transport from what you hand it.
TypeScript: construct the transport explicitly (`StdioClientTransport`,
`StreamableHTTPClientTransport`, `InMemoryTransport`) and pass it to `client.connect()`.

## Run it

```bash
npm run lesson -- 48
uv run lesson 48
```

No API key needed.

## Environment variables

None.

## References

- [MCP Python SDK v1→v2 migration](https://py.sdk.modelcontextprotocol.io/migration/)
- [MCP specification — transports](https://modelcontextprotocol.io/specification/latest)
- [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)
