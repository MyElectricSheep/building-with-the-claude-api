# 16 · Being clear and direct

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 16, _Being clear and direct_
>
> **2026 status: 🟢 Current**

## What the lesson teaches

Say what you want. Give the context the model cannot infer. State the output you
expect. Most "the model got it wrong" turns out to be "the prompt did not say".

## What the Academy does

Contrasts a vague prompt with an explicit one and shows the difference in output.

## What changed

Nothing. Anthropic's current prompt engineering guidance says the same thing in almost
the same words: be explicit, supply context, state the desired output format.

Two 2026 footnotes:

- With **adaptive thinking** on by default, the model will often work around an
  underspecified prompt by reasoning about what you probably meant. That makes a vague
  prompt _look_ fine on a good day and fail on a bad one — which is exactly why
  lesson 15's held-out split matters.
- Where "clear and direct" means "produce this exact shape", you now have a stronger
  tool than words: **structured outputs** (lesson 8). Say it in the prompt _and_
  constrain it with a schema.

## The current implementation

The same task under three prompts — vague, clear, and clear-with-a-schema — graded by
**code**, not by eye:

| Grader         | Checks                                            |
| -------------- | ------------------------------------------------- |
| word count     | 25–60 words, as asked                             |
| no preamble    | does not open with "Sure", "Certainly", "Here is" |
| has the number | the release date actually appears                 |

You will usually see the vague prompt fail the format graders while producing perfectly
reasonable prose. That is the point: "good output" and "the output I asked for" are
different measurements.

## Python vs TypeScript

Identical.

## Run it

```bash
npm run lesson -- 16
uv run lesson 16
```

Three cheap calls.

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Prompt engineering overview](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview)
- [Be clear and direct](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/be-clear-and-direct)
