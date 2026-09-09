# 50 · Defining tools with MCP

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 50, _Defining tools with MCP_
>
> **2026 status: 🔴 The import was removed, not deprecated**

## What the lesson teaches

Decorate a function and it becomes an MCP tool. The schema comes from the type hints;
the description comes from the docstring.

That model is unchanged and it is genuinely nice.

## What the Academy does

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("DocumentMCP")

@mcp.tool()
def read_doc_contents(doc_id: str) -> str:
    ...
```

## What changed

**`FastMCP` was renamed to `MCPServer`, and `mcp.server.fastmcp` was removed** — not
kept as an alias.

```python
# v1
from mcp.server.fastmcp import FastMCP
mcp = FastMCP("DocumentMCP")

# v2
from mcp.server.mcpserver import MCPServer
mcp = MCPServer("DocumentMCP")
```

Note the module path: the audit that prompted this repository said
`from mcp.server import MCPServer`, but the class lives at
`mcp.server.mcpserver`. Verified against the installed SDK — see
`legacy.py`, which prints the real error, and the real error is helpful: it names the
new class and the pin.

**The decorators did not change.** `@mcp.tool()`, `@mcp.resource()`, `@mcp.prompt()` and
`@mcp.completion()` take the same arguments and the same handler signatures as v1. What
changed around them:

|                    | v1                   | v2                                                   |
| ------------------ | -------------------- | ---------------------------------------------------- |
| Import             | `mcp.server.fastmcp` | `mcp.server.mcpserver`                               |
| Context injection  | implicit             | explicit: `from mcp.server.mcpserver import Context` |
| Transport keywords | on the constructor   | on `run()`                                           |

> **Do not confuse this with the separately-versioned third-party `fastmcp` package.**
> The rename here is about the _official_ SDK's own class.

### One thing worth doing that the lesson does not

**Return errors as error results, not exceptions.** A raised exception becomes a
protocol error; an error result is something the model can read and react to. The
TypeScript server in this repository returns `{ isError: true, content: [...] }`; the
Python decorator turns a raised `ValueError` into a tool error result for you, which is
why the Python version raises and the TypeScript version returns.

## The current implementation

- `example.*` — three tools on the v2 API (`read_document`, `list_documents`,
  `edit_document`), exercised in-process, including the error paths.
- `legacy.py` — attempts the v1 import and prints the real `ModuleNotFoundError`, which
  is unusually helpful: it names `MCPServer` and the `mcp<2` pin.

The server itself lives in `shared/python/course/mcp_documents.py` and
`shared/typescript/mcp-documents.ts`, so lessons 51–56 and 60 all use the same one.

## Python vs TypeScript

Python derives the input schema from type hints and the description from the docstring.
TypeScript uses `registerTool(name, {description, inputSchema: {...zod}}, handler)` —
the current API; the older positional `server.tool(...)` overloads still exist.

## Run it

```bash
npm run lesson -- 50
uv run lesson 50

uv run lesson 50 legacy   # the v1 import, and the error it gives
```

## Environment variables

None.

## References

- [MCP Python SDK v1→v2 migration](https://py.sdk.modelcontextprotocol.io/migration/)
- [MCP specification — tools](https://modelcontextprotocol.io/specification/latest)
