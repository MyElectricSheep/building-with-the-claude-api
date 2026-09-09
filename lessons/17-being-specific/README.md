# 17 · Being specific

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 17, _Being specific_
>
> **2026 status: 🟢 Current**

## What the lesson teaches

Where lesson 16 is about _saying_ what you want, this one is about _how precisely_.
Name the format. Name the constraints. Name the order of operations when order matters.
Say what to do about the edge case rather than hoping.

## What the Academy does

Shows progressively more specific prompts for the same task.

## What changed

Nothing. Current guidance explicitly recommends specifying desired format, constraints
and sequential steps.

The 2026 addition is knowing **which kind of specificity to move into the API**:

| You want                                        | Say it in the prompt | Enforce it in the API                                                            |
| ----------------------------------------------- | -------------------- | -------------------------------------------------------------------------------- |
| A JSON shape                                    | ✓ (helps)            | **`output_config.format`** (guarantees)                                          |
| A tool's argument shape                         | ✓                    | **`strict: true`** on the tool (lesson 23)                                       |
| Tone, ordering, what to do when data is missing | ✓                    | — no API equivalent, this is prompting                                           |
| Length                                          | ✓                    | `max_tokens` is a hard cut, not a length instruction — it truncates mid-sentence |

Structured outputs removed a whole category of prompt fiddling. What is left is the
genuinely linguistic part: judgement, ordering, and edge cases.

## The current implementation

An extraction task over a deliberately messy meeting note, run three ways:

1. **loose** — "extract the action items"
2. **specific** — names the fields, the date format, and what to do when an owner or a
   due date is missing
3. **specific + schema** — the same words, with the shape enforced

Graded on: does every item have the required keys, are dates ISO-8601, and is the
missing-owner case handled as instructed (`null`, not an invented name).

The interesting failure is #1: it produces something sensible but with a shape that
changes between runs, which is unusable downstream.

## Python vs TypeScript

Identical.

## Run it

```bash
npm run lesson -- 17
uv run lesson 17
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Prompt engineering overview](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview)
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
