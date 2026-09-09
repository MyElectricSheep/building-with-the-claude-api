# 49 · Project setup

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 49, _Project setup_
>
> **2026 status: 🟡 Architecture fine, dependency problem**

## What the lesson teaches

Scaffold the CLI project the MCP module builds: a chat app that connects to a document
MCP server.

The project is good. The dependency is the problem.

## What changed

The lesson's `pyproject.toml` declares `mcp` with no upper bound. That was fine when it
was recorded. **A fresh install today gives you MCP Python SDK v2**, and the lesson code
was written for v1 — so lessons 50–56 fail at import time before anything else can go
wrong.

```
ModuleNotFoundError: No module named 'mcp.server.fastmcp'
```

If you hit that, you did nothing wrong.

### The two legitimate choices

**Migrate to v2 (what this repository does, and what I would do).** You are taking this
course to learn the current ecosystem; learning a pinned v1 API and then relearning v2
immediately afterwards buys very little.

```toml
dependencies = ["mcp[cli]>=2,<3"]
```

**Or pin v1, to reproduce the course exactly.** The MCP maintainers explicitly recommend
this constraint for projects not ready to migrate:

```toml
dependencies = ["mcp[cli]>=1.28,<2"]
```

> Do not install both constraints in the same project or the same virtualenv.

### The v2 dependency changes that leak into your code

Beyond the import rename, v2 changed things you can trip over:

|                     | v1                                   | v2                                                                                                                                    |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP library        | `httpx` + `httpx-sse`                | **`httpx2`** — catch `httpx2` exceptions, not `httpx`                                                                                 |
| Types package       | `mcp.types`                          | moved to **`mcp-types`**; `from mcp.types import ...` still works if you depend on `mcp`                                              |
| Field names         | `result.isError`, `tool.inputSchema` | **snake_case**: `result.is_error`, `tool.input_schema`. The JSON wire format is unchanged; serialise with `model_dump(by_alias=True)` |
| Error class         | `McpError`                           | **`MCPError`**                                                                                                                        |
| WebSocket transport | present                              | **removed**                                                                                                                           |
| Floors              | —                                    | `anyio>=4.9`, `pydantic>=2.12`, plus a required `opentelemetry-api`                                                                   |

The TypeScript SDK went through no equivalent rename — it has always exported
`McpServer` — so the TypeScript half of this module is a much smaller change.

## The current implementation

`example.*` is a **doctor**: it reports the installed SDK generation, checks the imports
that differ between them, and prints the exact `pyproject.toml`/`package.json` lines for
whichever route you choose. No API key, no network.

## Python vs TypeScript

This lesson is mostly a Python problem. The TypeScript version reports the installed
`@modelcontextprotocol/sdk` version and checks the entry points this module uses.

## Run it

```bash
npm run lesson -- 49
uv run lesson 49
```

## Environment variables

None.

## References

- [MCP Python SDK v1→v2 migration](https://py.sdk.modelcontextprotocol.io/migration/)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
