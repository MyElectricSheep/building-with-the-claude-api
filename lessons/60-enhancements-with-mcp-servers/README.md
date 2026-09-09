# 60 · Enhancements with MCP servers

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 60, _Enhancements with MCP servers_
>
> **2026 status: 🟡 Very relevant — modernize the command**

## What the lesson teaches

Claude Code is an MCP **client**. Point it at the server you built in lessons 49–56 and
its tools, resources and prompts become available inside a coding session:

```
Claude Code
    ↓ MCP client
your document server
    ↓
tools / resources / prompts
```

This is the payoff for the whole MCP module, and it is more relevant now than when the
course was recorded.

## What the Academy does

```bash
claude mcp add documents uv run main.py
```

## What changed

The shorthand is ambiguous — is `uv` the command, or the transport? Be explicit:

```bash
claude mcp add --transport stdio documents -- uv run shared/mcp/document_server.py
```

| Part                | Why                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `--transport stdio` | states the transport. `-t` also works; valid values are `stdio`, `sse`, `http`                        |
| `--`                | separates the server's command from Claude Code's flags. Without it, the server's own flags get eaten |

Other forms worth knowing:

```bash
# a remote server
claude mcp add --transport http docs https://example.com/mcp

# with a header (auth)
claude mcp add -t http docs https://example.com/mcp -H "Authorization: Bearer ..."

# with environment variables for a stdio server
claude mcp add documents -e LOG_LEVEL=debug -- uv run shared/mcp/document_server.py

# scope: local (default, just you, this project) | project (committed) | user (all projects)
claude mcp add -s project documents -- uv run shared/mcp/document_server.py
```

`-s project` writes `.mcp.json` in the repository, which is how you share a server with
your team.

Then:

```bash
claude mcp list      # what is configured
claude mcp get docs  # one server's details
claude mcp remove docs
```

Inside a session, `/mcp` shows connected servers, and a server's prompts appear as
slash commands.

### The other direction

Claude Code is not the only client. The **MCP connector** (lesson 47) lets the Messages
API talk to a **remote** MCP server directly, with no client of your own — but it cannot
reach a **local stdio** server, which is what this lesson configures. The two are
complementary, not alternatives.

## The current implementation

`example.*` generates the exact command and the exact `.mcp.json` for **this
repository's** server, with absolute paths resolved, so you can copy one line rather
than reconstruct it. It also writes a ready-to-commit `.mcp.json` when you pass
`--write`.

No API key, no network.

## Python vs TypeScript

Two servers, two commands. The Python one is `uv run shared/mcp/document_server.py`;
the TypeScript one is `node shared/mcp/document-server.ts`. Both are generated.

## Run it

```bash
npm run lesson -- 60
uv run lesson 60

uv run lesson 60 -- --write     # write .mcp.json into the repo
```

Then, in a terminal at the repository root:

```bash
claude mcp add --transport stdio documents -- uv run shared/mcp/document_server.py
claude
# then ask: "what is the SEV1 rule?" and watch it call read_document
```

## Environment variables

None.

## References

- [Claude Code MCP](https://code.claude.com/docs/en/mcp)
- [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)
- [MCP specification](https://modelcontextprotocol.io/specification/latest)
