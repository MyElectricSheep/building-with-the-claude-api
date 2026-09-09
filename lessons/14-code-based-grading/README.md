# 14 · Code based grading

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 14, _Code based grading_
>
> **2026 status: 🟡 Mostly current**

## What the lesson teaches

When the answer is checkable, check it with code: `json.loads`, `ast.parse`, a regular
expression, an exact comparison. Deterministic, instant, free.

Anthropic's current evaluation guidance still ranks code-based grading **first**, above
model-based grading. Reach for a judge only for what code cannot see.

## What the Academy does

The graders themselves are all still good. The lesson also suggests adding a prefilled
` ```code ` assistant turn to make the model's output easier to parse.

## What changed

| Academy                                        | 2026                                                                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prefill ` ```code ` so the output is parseable | Obsolete — prefill 400s. If you need parseable output, **constrain** it with `output_config.format` rather than nudging it with a fence                       |
| Grading the raw text                           | Where the task has a schema, grade the _parsed object_, not the string. Structured outputs mean you no longer have to defend against "Sure! Here's the JSON:" |

Everything else stands: `json.loads`, `ast.parse`, regex, exact match, word counts,
banned-phrase checks are exactly as useful as they were.

One addition worth making explicit: **a code grader is a test, so test it.** The
graders in `shared/*/graders.*` have unit tests, and they run without credentials.
A grader that silently returns 1.0 for everything is worse than no grader.

## The current implementation

`example.*` runs **entirely locally — no API key, no network, no cost.** It grades a
set of pre-baked model outputs (including deliberately broken ones) so you can see each
grader fire:

- `isValidJson` / `is_valid_json` — parses or does not
- `is_valid_python` — `ast.parse`, syntax only, nothing is executed
- `matchesPattern` — ISO date shape
- `withinWordCount` — length bounds
- `avoidsPhrases` — banned filler
- `exactFields` — field-by-field comparison with partial credit

Then it points at the same graders being used against live output in lessons 9, 12
and 13.

> `is_valid_python` uses `ast.parse`, which checks **syntax only**. It never executes
> the string. If you want to grade behaviour, run the code in a sandbox — see
> lesson 46 for the code execution tool.

## Python vs TypeScript

Python has `ast.parse` for free; TypeScript has no equivalent in the standard library,
so `is_valid_python` is Python-only. Everything else is mirrored.

## Run it

```bash
npm run lesson -- 14
uv run lesson 14
```

No `ANTHROPIC_API_KEY` needed.

## Environment variables

None.

## References

- [Create strong empirical evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
