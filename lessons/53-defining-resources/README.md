# 53 · Defining resources

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 53, _Defining resources_
>
> **2026 status: 🟡 Mostly current — the decorator is unchanged, the server class is not**

## What the lesson teaches

Resources are **application-controlled** data addressed by URI. A resource is not
"a tool that reads" — the difference is who decides to fetch it:

|          | Decided by                           | Typical use                                |
| -------- | ------------------------------------ | ------------------------------------------ |
| Tool     | the **model**, mid-turn              | "read this document because I need it now" |
| Resource | the **application**, before the turn | "always include the user's open file"      |

Two kinds:

```python
@mcp.resource("docs://documents")            # a fixed URI
@mcp.resource("docs://documents/{doc_id}")   # a URI template
```

## What changed

Only the server class. `@mcp.resource(...)`, direct URIs and templates all work exactly
as the lesson describes — what changed is that `mcp` is now an `MCPServer` rather than a
`FastMCP` (lesson 50).

Three things worth knowing that the lesson does not cover:

1. **A template is discovered separately.** `list_resources()` returns concrete
   resources; templates come from **`list_resource_templates()`**. A client that only
   calls the first will never see your templated resources.
2. **v2 field names are snake_case in Python.** `template.uri_template`, not
   `uriTemplate`. The wire format is unchanged.
3. **Path parameters are untrusted input.** `docs://documents/{doc_id}` will be called
   with whatever a client sends. If `doc_id` reaches a filesystem, the same path-guard
   from lesson 30 applies — MCP does not sanitise it for you.

## The current implementation

Defines both shapes on the shared document server and exercises them: `list_resources`,
`list_resource_templates`, reading a fixed URI, expanding a template, and what a
template does with a `doc_id` that does not exist.

The server lives in `shared/python/course/mcp_documents.py` /
`shared/typescript/mcp-documents.ts` so lessons 51–56 all work against the same one.

## Python vs TypeScript

Python: `@mcp.resource("uri://{param}")` — the template is inferred from the string.
TypeScript: `server.registerResource(name, new ResourceTemplate("uri://{param}", {...}),
config, handler)` — the template is an explicit object, and the handler receives
`(uri, variables)`.

## Run it

```bash
npm run lesson -- 53
uv run lesson 53
```

No API key needed.

## Environment variables

None.

## References

- [MCP specification — resources](https://modelcontextprotocol.io/specification/latest)
- [MCP Python SDK v1→v2 migration](https://py.sdk.modelcontextprotocol.io/migration/)
