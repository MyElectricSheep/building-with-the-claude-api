# 37 · BM25 lexical search

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 37, _BM25 lexical search_
>
> **2026 status: 🟢 Current**

## What the lesson teaches

Not everything is semantic. BM25 scores documents by term frequency, inverse document
frequency, and length normalisation — it finds the **exact token**, which is precisely
what embeddings blur.

```
"how long until I can deploy to prod?"   → semantic wins
"what is ticket type ACCESS-PROD?"       → lexical wins
```

## What the Academy does

Introduces BM25 as a complement to vector search, not a replacement. Correct then,
correct now.

## What changed

Nothing. This is not a pre-LLM leftover — Anthropic's own contextual-retrieval work
combines embeddings with BM25-style lexical retrieval, and that combination is still
the recommended baseline for a serious retrieval stack.

What is worth adding is _why_ it holds up, precisely:

| Query contains                                          | Embeddings                                          | BM25                  |
| ------------------------------------------------------- | --------------------------------------------------- | --------------------- |
| a paraphrase of an idea                                 | strong                                              | weak                  |
| an exact identifier (`ACCESS-PROD`, `#A-77210`, `SEV2`) | **weak** — rare tokens carry little semantic signal | **strong**            |
| a term that appears in one document only                | fine                                                | **strong** — high IDF |
| a common word                                           | fine                                                | weak — low IDF        |
| a misspelling                                           | tolerant                                            | brittle               |

The failure modes are close to complementary, which is the whole argument for hybrid
retrieval in lesson 38.

## The current implementation

`example.*` runs **entirely locally — no API key, no network, no cost.** It:

1. builds a BM25 index over the corpus chunks,
2. runs every question and prints the ranking,
3. shows the IDF term weights for one query, so "why did that rank first" is visible
   rather than magic,
4. runs a **term-vs-paraphrase pair** on the same fact — `"ACCESS-PROD"` versus
   `"what paperwork lets me reach the live environment?"`. BM25 finds the identifier
   immediately and lands the paraphrase in the wrong document, because the paraphrase
   shares no rare token with the one that answers it.

That last pair is lesson 38's motivation in one screen.

## Python vs TypeScript

Mirrored implementations with the same unit tests either side. Both use the standard
Okapi BM25 with `k1 = 1.5`, `b = 0.75`.

## Run it

```bash
npm run lesson -- 37
uv run lesson 37
```

No `ANTHROPIC_API_KEY`, no `VOYAGE_API_KEY`.

## Environment variables

None.

## References

- [Contextual retrieval](https://www.anthropic.com/news/contextual-retrieval)
