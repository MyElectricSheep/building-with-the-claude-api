# 47 · Introducing MCP

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 47, _Introducing MCP_
>
> **2026 status: 🟢 Concept current — and considerably more important than when recorded**

## What the lesson teaches

The Model Context Protocol is a standard interface between a model-facing application
and a source of capability. A **server** exposes three kinds of thing:

| Primitive     | Controlled by   | Think of it as                                         |
| ------------- | --------------- | ------------------------------------------------------ |
| **Tools**     | the model       | actions it can decide to take                          |
| **Resources** | the application | data addressed by URI, that the app chooses to include |
| **Prompts**   | the user        | reusable templates the user invokes deliberately       |

The distinction matters: a resource is not "a tool that reads". A tool is invoked by the
model; a resource is fetched by the application; a prompt is chosen by a human.

Write the server once and every MCP-speaking client — Claude Code, Claude Desktop, your
own application — can use it.

## What changed

Nothing about the model. What changed is the surrounding ecosystem, and two additions
are worth knowing before you build anything.

### 1. The Claude API can connect to remote MCP servers directly

You no longer always need to write the intermediary client the course builds. The
**MCP connector** lets the Messages API talk to a remote MCP server:

```python
client.beta.messages.create(
    model=MODEL,
    max_tokens=1000,
    betas=["mcp-client-2025-11-20"],
    mcp_servers=[{"type": "url", "url": "https://example.com/mcp", "name": "docs"}],
    tools=[{"type": "mcp_toolset", "mcp_server_name": "docs"}],
    messages=[...],
)
```

> **Both halves are required.** `mcp_servers` on its own is a validation error — you must
> also declare the matching `mcp_toolset` in `tools`, with the same `name`.

The course's hand-written client is still worth building: it is how you learn the
protocol, and it is what you need for a **local stdio** server, which the connector
cannot reach.

### 2. The Python SDK ships MCP conversion helpers

`anthropic.lib.tools.mcp` converts MCP tools, prompts and resources into Anthropic API
types — `mcp_tool` / `async_mcp_tool` for the tool runner, `mcp_message` for prompts,
`mcp_resource_to_content` for resources. Requires `pip install "anthropic[mcp]"`.

## The current implementation

Connects to the document server **in-process** — no subprocess, no transport, no ports —
and prints its tools, resources, resource templates and prompts, with a note on who
controls each.

Running in-process is not a toy: MCP Python SDK v2's `Client` accepts an `MCPServer`
directly, and the TypeScript SDK has `InMemoryTransport`. It is how you unit-test an MCP
server, and it is why this repository's MCP lessons have tests.

## Python vs TypeScript

Python: `Client(mcp)` where `mcp` is the `MCPServer`.
TypeScript: `InMemoryTransport.createLinkedPair()` and connect both ends.

Also note: **v2 model fields are snake_case** in Python (`resource_templates`,
`is_error`, `input_schema`). The wire format is unchanged; only the Python attribute
names moved.

## Run it

```bash
npm run lesson -- 47
uv run lesson 47
```

No API key needed.

## Environment variables

None.

## References

- [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)
- [MCP specification](https://modelcontextprotocol.io/specification/latest)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [MCP Python SDK v1→v2 migration](https://py.sdk.modelcontextprotocol.io/migration/)
