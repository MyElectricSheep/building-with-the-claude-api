# 19 · Providing examples

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 19, _Providing examples_
>
> **2026 status: 🟢 Current**

## What the lesson teaches

Few-shot prompting. Showing three worked examples usually beats a paragraph describing
what you want, especially for format and for edge cases that are awkward to state.

## What the Academy does

Adds example input/output pairs to the prompt and shows the output become more
consistent.

## What changed

Nothing was deprecated. Current guidance refines the advice:

- **3–5 examples**, not one and not twenty. One example is often mistaken for a
  template to copy; twenty is expensive and starts to crowd out the actual input.
- **Diverse** examples. Examples that all look the same teach a narrow rule. Include
  the edge case you actually care about — that is where few-shot earns its keep.
- Wrap them in `<example>` / `<examples>` tags (lesson 18).

Two 2026 notes:

1. **Structured outputs replace format-only examples.** If your examples exist purely
   to demonstrate the JSON shape, delete them and use `output_config.format` — it is
   cheaper and it is a guarantee. Keep examples for _judgement_: which category a
   borderline case belongs in, how terse "terse" means.
2. **Examples are a caching opportunity.** A stable block of examples is exactly the
   kind of long, unchanging prefix that prompt caching is for (lesson 43). Put them
   before the variable input.

## The current implementation

The triage task from lesson 9, three ways:

1. **zero-shot** — the terse `PROMPT_V1`
2. **few-shot** — `PROMPT_V1` plus four `<example>` pairs, chosen to cover the
   awkward cases: an "URGENT" feature request, the bare word "order", a bug with an
   order id, and a plain account question
3. **specified** — `PROMPT_V2`, which states the rules in prose instead

Graded against the held-out split. The comparison is the point: examples and
specification are two routes to the same place, and which wins is an empirical
question, not a stylistic one.

## Python vs TypeScript

Identical.

## Run it

```bash
npm run lesson -- 19
uv run lesson 19
```

Twelve cheap calls (4 held-out cases × 3 prompts).

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Prompt engineering overview](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview)
- [Use examples (multishot prompting)](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/multishot-prompting)
- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
