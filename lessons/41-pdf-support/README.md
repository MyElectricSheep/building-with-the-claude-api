# 41 · PDF support

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 41, _PDF support_
>
> **2026 status: 🟡 Current, with a better option the lesson predates**

## What the lesson teaches

Send a PDF as a `document` content block with a base64 payload. Claude reads both the
text _and_ the visual layout — tables, charts, figures — which is why it beats
pre-extracting the text yourself.

## What the Academy does

```python
{"type": "document",
 "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_data}}
```

Still valid. Two mechanical details worth repeating because they cause confusing errors:

- the base64 string must have **no newlines**;
- put the `document` block **before** the text block.

## What changed

### Files API

Same story as images (lesson 40): upload once, reference by `file_id`.

```python
{"type": "document", "source": {"type": "file", "file_id": uploaded.id}}
```

For a document you ask several questions about, this is strictly better — the bytes
travel once instead of on every turn. The Files API is **out of beta**: use
`client.files.*` with no beta header.

### The limits moved

|                   | Academy | Current                                                  |
| ----------------- | ------- | -------------------------------------------------------- |
| Pages per request | ~100    | **100** for 200k-context models, up to **600** otherwise |
| Request size      | —       | **32 MB** total, which usually binds first               |

### Citations

A `document` block takes `citations: {enabled: true}`, and then answers come back with
`page_location` spans — `start_page_number` / `end_page_number`, 1-indexed. For a PDF
that is a much stronger answer than prose: you can check it. Lesson 42 covers the
mechanics.

> **Citations and structured outputs cannot be combined.** A request with both
> `citations` and `output_config.format` returns a 400.

## The current implementation

The same PDF, three ways:

1. base64 — the Academy form, with the token count
2. `file_id` — uploaded once, then **three questions asked against it**, so the
   multi-turn payload argument is visible rather than asserted
3. `file_id` + citations — answers with page numbers you can verify

It prints `count_tokens` for each shape, and cleans up the uploaded file afterwards.

## Python vs TypeScript

Python passes a tuple or file object to `client.files.upload(...)`; TypeScript uses
`toFile()`. Everything else matches.

## Run it

```bash
npm run lesson -- 41
uv run lesson 41
```

Uses `assets/pdf/earth.pdf`.

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [PDF support](https://platform.claude.com/docs/en/build-with-claude/pdf-support)
- [Files API](https://platform.claude.com/docs/en/build-with-claude/files)
- [Citations](https://platform.claude.com/docs/en/build-with-claude/citations)
