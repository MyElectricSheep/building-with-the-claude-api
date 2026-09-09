# 42 · Citations

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 42, _Citations_
>
> **2026 status: 🟢 Current — with one new incompatibility**

## What the lesson teaches

Set `citations: {enabled: true}` on a `document` block and Claude returns answers split
into text blocks, where the cited ones carry a `citations` array pointing back at the
exact span it used.

This is the difference between "the model says X" and "the model says X, and here is
the sentence it read".

## What the Academy does

```python
{"type": "document", "source": {...}, "citations": {"enabled": True}}
```

Unchanged.

## What changed

### It works with more document types now

Citations work with base64 documents, **Files API `file_id` documents**, plain text
documents, and custom-content documents.

### Location types

The `type` of each citation's location tells you what you can do with it:

| `type`                       | Fields                                             | Source                   |
| ---------------------------- | -------------------------------------------------- | ------------------------ |
| `char_location`              | `start_char_index`, `end_char_index`               | plain text documents     |
| `page_location`              | `start_page_number`, `end_page_number` (1-indexed) | PDFs                     |
| `content_block_location`     | block indices                                      | custom-content documents |
| `web_search_result_location` | `url`, `title`, `encrypted_index`                  | web search (lesson 31)   |

Always branch on `citation.type`. A PDF citation has no `start_char_index`.

### The new restriction

> **Citations and structured outputs cannot be combined.** A request carrying both
> `citations: {enabled: true}` and `output_config.format` returns a **400**.

This one bites in RAG systems, because both are things you want: verifiable spans _and_
a parseable shape. You have to choose per request. The usual resolution is two calls —
one cited answer for the human, one structured extraction for the machine — or citations
for the answer and code-level parsing of the text.

### One rule that is easy to miss

`citations` is **all or nothing across the documents in a request**. Enable it on every
`document` block or none.

## The current implementation

Three parts:

1. **Cited answers over the corpus** — text documents with `citations` enabled,
   printing each cited span with its character offsets and the exact source text, so
   you can see the citation is a real pointer rather than a paraphrase.
2. **A verification pass** — every `cited_text` is checked against the document it
   claims to come from. If a span does not match, the example says so. That check is
   the whole point of citations, and almost nobody writes it.
3. **The 400** — a deliberate request combining citations with
   `output_config.format`, caught and printed.

## Python vs TypeScript

Identical. In TypeScript the citation union narrows on `citation.type`.

## Run it

```bash
npm run lesson -- 42
uv run lesson 42
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Citations](https://platform.claude.com/docs/en/build-with-claude/citations)
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [PDF support](https://platform.claude.com/docs/en/build-with-claude/pdf-support)
