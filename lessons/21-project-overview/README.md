# 21 · Project overview

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 21, _Project overview_
>
> **2026 status: 🟢 Current**

## What the lesson teaches

The project the rest of the module builds: a reminder agent. The user says
"remind me about the SSO cert renewal a week from now"; Claude has to work out what
"a week from now" means and then create the reminder.

Three tools, deliberately small and composable:

| Tool                       | Why it exists                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `get_current_datetime`     | The model does not know what time it is. Nothing else works without this               |
| `add_duration_to_datetime` | Relative dates ("a week from now") need arithmetic the model should not do in its head |
| `set_reminder`             | The actual side effect                                                                 |

## What the Academy does

Sets out the same project. No API surface to go stale.

## What changed

Nothing about the project. Two design notes worth adding, because they are what the
module is really teaching:

1. **The tools compose.** Answering the request needs all three, in order, with each
   result feeding the next. That is what makes it a good vehicle for the loop in
   lesson 27 — a single-tool example never shows you the interesting part.
2. **Exactly one of them mutates.** `set_reminder` is the only tool with a side effect,
   and it is the only one that needs idempotency and authorisation. The other two are
   read-only and safe to retry. Lesson 27 comes back to this; `strict: true` does not
   help you here.

This repository's version of the project lives in `shared/typescript/tools.ts` and
`shared/python/course/tools.py`, with `strict: true` on every schema and a real
idempotency check in the store.

## The current implementation

Prints the three tool definitions as the API will see them and runs one end-to-end
request so you can watch the three calls chain. Read the output next to lesson 27's
loop — this is what that loop is driving.

## Python vs TypeScript

Identical schemas. Python dicts and TypeScript object literals serialise to the same
JSON.

## Run it

```bash
npm run lesson -- 21
uv run lesson 21
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
