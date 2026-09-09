# 51 · The server inspector

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 51, _The server inspector_
>
> **2026 status: 🟡 Workflow current, your server has to be v2**

## What the lesson teaches

Before wiring a server into a client, poke at it by hand. `mcp dev` starts your server
and launches the **MCP Inspector**, a browser UI that lists tools, resources and prompts
and lets you call them with arbitrary arguments.

This is still the right first move on a new server, and `mcp dev` is still the command.

## What changed

Only the prerequisite: the Inspector will happily connect to your server, but **the
server has to import** first. An Academy-era `FastMCP` server raises
`ModuleNotFoundError` under v2 before the Inspector ever sees it (lesson 50).

The v2 CLI (`mcp[cli]`) has four commands:

| Command              | What it does                           |
| -------------------- | -------------------------------------- |
| `mcp dev <file>`     | run the server **with the Inspector**  |
| `mcp run <file>`     | run the server plainly                 |
| `mcp install <file>` | install it into the Claude desktop app |
| `mcp version`        | print the SDK version                  |

```bash
uv add "mcp[cli]>=2,<3"
uv run mcp dev shared/mcp/document_server.py
```

The Inspector is a Node package fetched on demand, so the first run needs network and
`npx`.

### The alternative when you cannot open a browser

An in-process client does the same job in a terminal, and unlike the Inspector it can be
committed as a test. That is what `example.*` is, and it is why this repository's MCP
lessons have real test coverage.

### What to actually check

| Check                                                       | Why it bites later                                                     |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| Every tool has a **description**                            | It is the prompt. A tool with none is a tool the model will not choose |
| Required arguments are correct                              | An over-required schema makes simple calls fail                        |
| Error paths return **error results**, not protocol failures | An exception kills the turn; an error result lets the model recover    |
| Resource templates expand                                   | A typo in `docs://documents/{doc_id}` fails only at read time          |
| Prompts render with real arguments                          | Same                                                                   |

## The current implementation

A terminal inspector: connects in-process, then walks every tool, resource, template and
prompt, calling each one with plausible arguments and reporting what came back —
including the failures. It ends with a checklist verdict.

It also prints the exact `mcp dev` command for the browser Inspector.

## Python vs TypeScript

The Python CLI (`mcp dev`) has no TypeScript equivalent in this SDK; for a TS server you
run the Inspector directly with `npx @modelcontextprotocol/inspector node server.ts`.
The terminal inspector in `example.ts` works either way.

## Run it

```bash
npm run lesson -- 51
uv run lesson 51

# the browser Inspector (needs network + npx)
uv run mcp dev shared/mcp/document_server.py
```

## Environment variables

None.

## References

- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
