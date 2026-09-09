# 55 · Defining prompts

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 55, _Defining prompts_
>
> **2026 status: 🔴 The concept is first-class; the v1 helper imports are gone**

## What the lesson teaches

MCP prompts are **user-controlled** templates. A server ships a named, parameterised
prompt; a client surfaces it as something a person picks — `/summarise_document` in a
slash-command menu, say — and the arguments are filled in and rendered server-side.

The point is that the _server_ owns the wording. Update the prompt on the server and
every client that uses it improves, with no client change.

## What the Academy does

```python
from mcp.server.fastmcp.prompts import base

@mcp.prompt()
def format_document(doc_id: str) -> list[base.Message]:
    return [base.UserMessage(...)]
```

## What changed

Two things, one fatal:

1. **`mcp.server.fastmcp` was removed.** Every import under it, including the prompt
   helpers, raises `ModuleNotFoundError`. This is the same rename as lesson 50, and it
   catches people twice because the prompt helpers live in a submodule they forget to
   update.
2. **`@mcp.prompt()` itself is unchanged.** Same decorator, same signature, same
   handler contract.

The simplest current form needs no helper import at all — return a string and the SDK
wraps it as a single user message:

```python
from mcp.server.mcpserver import MCPServer

mcp = MCPServer("DocumentMCP")

@mcp.prompt()
def summarise_document(doc_id: str) -> str:
    """A reusable prompt for summarising one document."""
    return f"Read '{doc_id}' with read_document, then summarise it in two sentences."
```

For a multi-turn prompt, return a list of message objects from the v2 types.

### Design notes the lesson does not make

- **The docstring is the menu entry.** It is what a client shows a user picking from a
  list. Write it for a human.
- **Argument names are the form fields.** `doc_id` is fine; `x` is not.
- **A prompt is not a tool.** If the model should decide when to run it, it is a tool.
  A prompt is for when a _person_ decides.

## The current implementation

- `example.*` — two prompts on the v2 API (one argument and two), rendered with real
  arguments so you can see the exact messages a client would send.
- `legacy.py` — the v1 helper import, and the error it produces.

## Python vs TypeScript

Python: `@mcp.prompt()` on a function returning a string or messages; the argument
schema comes from the signature. TypeScript:
`server.registerPrompt(name, {description, argsSchema}, handler)`, where `argsSchema` is
a Zod shape and the handler returns `{messages: [...]}` explicitly.

## Run it

```bash
npm run lesson -- 55
uv run lesson 55

uv run lesson 55 legacy   # the v1 import, and the error it gives
```

No API key needed.

## Environment variables

None.

## References

- [MCP specification — prompts](https://modelcontextprotocol.io/specification/latest)
- [MCP Python SDK v1→v2 migration](https://py.sdk.modelcontextprotocol.io/migration/)
