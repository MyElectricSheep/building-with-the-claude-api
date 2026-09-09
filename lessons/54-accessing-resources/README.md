# 54 · Accessing resources

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 54, _Accessing resources_
>
> **2026 status: 🟠 Operations current, client style and one assumption outdated**

## What the lesson teaches

From the client side: `list_resources()`, `read_resource(uri)`, and putting the result
into a prompt. Those operations are unchanged.

## What changed

### 1. Use the high-level client

Access resources through v2's `Client` rather than recreating the Academy's `ClientSession`
wrapper. Same operations, four fewer layers. Lesson 52.

### 2. Do not assume one content block

This is the correction with teeth. A read returns **`contents`, a list**, and each entry
is either

```
{uri, mimeType, text}      or      {uri, mimeType, blob}
```

The Academy's example reaches for the single text block. Three ways that breaks:

- a resource that returns several parts (a directory listing, a multi-part document);
- a **binary** resource, where there is `blob` and no `text` — reading `.text` gives
  `None` in Python and a compile error in TypeScript;
- a resource that legitimately returns **zero** blocks.

Preserve the structure: keep the URI, the MIME type, and each block, rather than
flattening everything to one string. `resource_text()` / `resourceText()` in
`shared/*/mcp-documents` does the narrowing, and it is deliberately explicit about the
blob case rather than hiding it.

### 3. Templates need a separate listing

`list_resources()` returns concrete URIs only. Templates come from
`list_resource_templates()` (lesson 53). A client that lists only the first will report
that your server has "one resource" when it has a whole family.

## The current implementation

The full application-side flow:

1. discover concrete resources **and** templates;
2. read each one and print its shape — block count, MIME type, text vs blob;
3. handle a **binary** resource correctly, so the `blob` branch is exercised rather than
   described;
4. inject the retrieved resources into a Claude prompt as `document` blocks with
   citations, which is what "the application decides what to include" actually looks
   like.

Pass `--no-claude` for the discovery half only, with no API key.

## Python vs TypeScript

Python: `await client.read_resource(uri)` → `result.contents`, snake_case fields
(`mime_type`). TypeScript: `await client.readResource({uri})` → `result.contents`,
camelCase (`mimeType`), and the union forces you to narrow before reading `.text`.

## Run it

```bash
npm run lesson -- 54
uv run lesson 54

npm run lesson -- 54 -- --no-claude
uv run lesson 54 -- --no-claude
```

## Environment variables

- `ANTHROPIC_API_KEY` (not needed with `--no-claude`)

## References

- [MCP specification — resources](https://modelcontextprotocol.io/specification/latest)
- [Citations](https://platform.claude.com/docs/en/build-with-claude/citations)
