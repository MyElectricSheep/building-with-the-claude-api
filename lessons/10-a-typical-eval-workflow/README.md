# 10 · A typical eval workflow

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 10, _A typical eval workflow_
>
> **2026 status: 🟢 Current**

## What the lesson teaches

The loop:

```
write prompt → build dataset → run → grade → compare → change one thing → repeat
```

## What the Academy does

Walks through the loop conceptually and wires up the course helper functions.

## What changed

Nothing deprecated. Current guidance adds two things:

1. **Change one thing at a time.** If you edit the prompt and swap the model in the
   same step, the delta tells you nothing.
2. **Record what produced a number.** Prompt version, model, dataset version, date.
   Otherwise last week's 83% is not comparable to this week's 91%.

## The current implementation

Runs the _same_ dataset through **two prompt versions** and prints both reports plus a
per-case diff, so you can see which cases the change fixed and which it broke.

`PROMPT_V1` is deliberately underspecified — "You are a support triage assistant.
Classify the email." `PROMPT_V2` says what each category means, what counts as an order
identifier, and how urgency is decided. Every sentence in v2 exists because v1 got a
case wrong.

Watch for the case a prompt change _breaks_. Mean score going up while an individual
case regresses is the single most common way an eval misleads you, and the per-case
diff is what catches it.

## Python vs TypeScript

Identical logic.

## Run it

```bash
npm run lesson -- 10
uv run lesson 10
```

Twelve calls on the cheap model (6 cases × 2 prompts).

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Create strong empirical evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
