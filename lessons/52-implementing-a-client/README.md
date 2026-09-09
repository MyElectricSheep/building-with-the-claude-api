# 52 · Implementing a client

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 52, _Implementing a client_
>
> **2026 status: 🟠 Modernize — but the low-level client is still supported**

## What the lesson teaches

Build the client half: start the server, connect, initialise, list tools, call them, and
bridge them to Claude.

The _architecture_ is right. The plumbing is a generation old.

## What the Academy does

```python
async with stdio_client(server_params) as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()
        tools = await session.list_tools()
```

Four layers: transport → raw streams → session → explicit `initialize()`.

## What changed

SDK v2 introduced a **high-level `Client`** that owns all four:

```python
from mcp import Client, StdioServerParameters

server = StdioServerParameters(command="uv", args=["run", "main.py"])

async with Client(server) as client:
    tools = await client.list_tools()
```

`Client` handles process startup, transport selection, protocol negotiation,
`initialize()`, and shutdown. It also accepts a **URL string** (Streamable HTTP) or an
`MCPServer` instance (in-process) — so the same code covers all three transports from
lesson 48.

**`ClientSession` was not removed.** It is the low-level escape hatch, and it is the
right tool when you need to own the streams: a custom transport, unusual lifecycle,
protocol-level instrumentation. It is just no longer the thing to learn first.

## Bridging MCP tools to Claude

This is the part that makes the CLI project work, and it is one conversion:

```
MCP tool                       Anthropic tool
  name              →            name
  description       →            description
  input_schema      →            input_schema
```

Then the ordinary tool loop from lesson 27 runs, and each `tool_use` is dispatched to
`client.call_tool(...)` instead of a local function.

Two things worth doing that the lesson does not:

- **Namespace the tool names** if you connect several servers. Two servers both exposing
  `search` is a silent collision.
- **Map an MCP error result onto `is_error: true`** in the `tool_result`, so the model
  can recover rather than seeing a plain string.

The Python SDK also ships helpers for exactly this — `mcp_tool` / `async_mcp_tool` in
`anthropic.lib.tools.mcp`, for use with the tool runner (`pip install "anthropic[mcp]"`).

## The current implementation

`example.*` does three things:

1. connects with the **high-level client** and lists what is there;
2. does the same with the **low-level `ClientSession`**, so you can count the lines the
   high-level client saves;
3. bridges the MCP tools to Claude and runs a real question through the loop — the
   actual point of the CLI project.

Pass `--no-claude` to skip step 3 and run with no API key.

## Python vs TypeScript

Python: `Client(...)` accepts a `StdioServerParameters`, a URL string, or an
`MCPServer`. TypeScript: construct the transport explicitly and pass it to
`client.connect(transport)` — there is no equivalent auto-selection, and there is no
lower "session" layer to drop to.

## Run it

```bash
npm run lesson -- 52
uv run lesson 52

npm run lesson -- 52 -- --no-claude    # no API key needed
uv run lesson 52 -- --no-claude
```

## Environment variables

- `ANTHROPIC_API_KEY` (not needed with `--no-claude`)

## References

- [MCP Python SDK v1→v2 migration](https://py.sdk.modelcontextprotocol.io/migration/)
- [Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)
