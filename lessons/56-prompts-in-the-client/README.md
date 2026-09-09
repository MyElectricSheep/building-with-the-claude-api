# 56 · Prompts in the client

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 56, _Prompts in the client_
>
> **2026 status: 🟠 Capability current, plumbing outdated**

## What the lesson teaches

The client half of prompts: `list_prompts()` to build a menu, `get_prompt(name, args)`
to render it, then send the rendered messages to Claude.

The operations are unchanged. What needs replacing is the v1 client plumbing under them
(lesson 52), not MCP prompts.

## What changed

1. **Use the high-level `Client`.** Same two calls, four fewer layers.
2. **Don't assume one message with one text block.** A prompt can render to several
   messages, and a message's content can be text, an image, or an embedded resource.
   Same lesson as 54: preserve the structure.
3. **The rendered messages are MCP messages, not Anthropic messages.** They look alike,
   which is exactly why the conversion gets skipped. Map `role` and content type
   explicitly, and decide what to do with an embedded-resource block — usually promote
   it to a `document` block rather than stringifying it.

The Python SDK ships a helper for this: `mcp_message` in `anthropic.lib.tools.mcp`
converts an MCP prompt message to an Anthropic one (`pip install "anthropic[mcp]"`).

## The full loop this lesson completes

```
list_prompts()          -> the user picks one          (lesson 55)
get_prompt(name, args)  -> the server renders it
convert                 -> Anthropic message params
messages.create(tools)  -> the model may call MCP tools (lesson 52)
call_tool()             -> executed on the server      (lesson 50)
```

That is the whole CLI project, and it is what makes MCP worth the ceremony: the server
supplies the wording _and_ the tools, the client supplies the loop.

## The current implementation

Builds the menu, renders `/summarise_document` with an argument, converts the messages,
and runs the full tool loop against Claude — so the prompt's instruction ("read the
document with the read_document tool") actually causes an MCP tool call.

Pass `--no-claude` to see the menu and rendered messages with no API key.

## Python vs TypeScript

Python: `client.get_prompt(name, arguments)` → `result.messages`, each with
`.content.text`. TypeScript: `client.getPrompt({name, arguments})`, and the content union
must be narrowed before reading `.text`.

## Run it

```bash
npm run lesson -- 56
uv run lesson 56

npm run lesson -- 56 -- --no-claude
uv run lesson 56 -- --no-claude
```

## Environment variables

- `ANTHROPIC_API_KEY` (not needed with `--no-claude`)

## References

- [MCP specification — prompts](https://modelcontextprotocol.io/specification/latest)
- [Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
