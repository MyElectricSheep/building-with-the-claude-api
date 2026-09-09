# 11 · Generating test datasets

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 11, _Generating test datasets_
>
> **2026 status: 🟠 Concept current, both helper patterns incompatible**

## What the lesson teaches

Hand-writing 50 test cases is tedious, so have a cheap model generate candidates and
then curate them.

The idea is sound and still recommended. The lesson's _implementation_ carries two
patterns that no longer run.

## What the Academy does

````python
def chat(messages, temperature=1.0, stop_sequences=[]):   # (1)
    ...

add_user_message(messages, "Generate 5 test cases ...")
add_assistant_message(messages, "```json")                 # (2)
text = chat(messages, stop_sequences=["```"])
````

## What changed

| #   | Academy pattern                                 | 2026                                                                                                                                |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `temperature=1.0` in the shared `chat()` helper | Removed. Python SDK v1 raises `TypeError`; the API 400s on Claude 4.7+. Fix the **helper**, not just the call that happened to fail |
| 2   | Assistant prefill + `stop_sequences` for JSON   | `output_config.format`. See lesson 8                                                                                                |

Because the `chat()` helper is shared across the whole eval module, one bad default
parameter breaks lessons 11–15 at once. That is the actual lesson here: the Academy's
helper is course scaffolding, and its defaults were written for an older API.

### Three additions worth knowing

1. **Generate with a schema.** Ask for an array of cases under
   `output_config.format` and you get a parseable array or an explicit failure —
   never "Sure! Here are your test cases:" followed by JSON.
2. **Use a different model to generate than to test.** A model generating its own
   exam writes cases it happens to be good at.
3. **Generated cases are candidates, not ground truth.** This example writes them to
   `assets/eval/generated.json` with `"reviewed": false` on every case, and lesson 12
   refuses to score unreviewed cases. Curation is the human's job.

## The current implementation

Generates N support-email cases with `CLAUDE_FAST_MODEL` under a JSON Schema, checks
them for the obvious failure modes (duplicate ids, labels outside the enum, an email
that does not match its own `has_order_id` label), and writes the survivors to
`assets/eval/generated.json`.

The validation step is pure and unit-tested, so you can see what "curation" means
mechanically before you do the human part.

## Python vs TypeScript

Identical. Both write the same JSON file, so you can generate in one language and
evaluate in the other.

## Run it

```bash
npm run lesson -- 11
uv run lesson 11

# generate a different number
npm run lesson -- 11 -- --count 8
uv run lesson 11 -- --count 8
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Create strong empirical evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Model and parameter deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)
