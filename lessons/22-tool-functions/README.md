# 22 · Tool functions

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 22, _Tool functions_
>
> **2026 status: 🟢 Current**

## What the lesson teaches

The implementations behind the schemas are just functions. Nothing about them is
Claude-specific: they take arguments, they return a value, they raise on bad input.

## What the Academy does

Writes the three reminder functions with validation and error handling. Still exactly
right.

## What changed

Nothing. Three points that were good advice then and are load-bearing now:

1. **Validate anyway.** `strict: true` (lesson 23) guarantees the arguments match the
   schema. It does not guarantee they make _sense_ — a schema-valid
   `remind_at: "1970-01-01T00:00:00Z"` is still nonsense, and a schema-valid
   `invoice_id` is still not proof the caller may touch that invoice. Schema
   validation is not business validation and it is not authorisation.
2. **Raise, don't return a string.** Let the caller decide whether an error becomes
   `is_error: true` in a `tool_result` (lesson 25) or aborts the run.
3. **Make them testable.** `get_current_datetime` takes an injectable clock, so the
   whole tool layer has unit tests that run without credentials. A tool you cannot test
   is a tool you cannot debug when the agent misbehaves at turn six.

The 2026 addition worth knowing: with the **SDK tool runner** (lesson 27) these
functions become the tools directly — `@beta_tool` in Python derives the schema from
the signature and docstring, `betaZodTool` in TypeScript from a Zod schema. The
functions do not change; the plumbing does.

## The current implementation

`example.*` runs **entirely locally — no API key, no network, no cost.** It exercises
each function, including every failure path:

- a bad datetime string
- an unknown duration unit
- empty reminder text
- an unknown tool name reaching the dispatcher
- the idempotency check: creating the same reminder twice yields one reminder

That last one matters. If a request is retried — and the SDK retries 429s and 5xxs
automatically — a mutating tool without idempotency silently creates two reminders.

## Python vs TypeScript

Mirrored. Python's `timedelta(**{unit: amount})` does the arithmetic; TypeScript uses a
milliseconds-per-unit table.

## Run it

```bash
npm run lesson -- 22
uv run lesson 22
```

No `ANTHROPIC_API_KEY` needed. The unit tests are in
`shared/typescript/tools.test.ts` and `tests/python/test_tools.py`.

## Environment variables

None.

## References

- [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- [Strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use)
