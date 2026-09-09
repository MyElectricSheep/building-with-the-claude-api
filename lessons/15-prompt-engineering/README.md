# 15 · Prompt engineering

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 15, _Prompt engineering_
>
> **2026 status: 🟡 Current loop, confusing tooling**

## What the lesson teaches

The loop that makes prompt engineering an engineering discipline rather than a
superstition:

```
eval → read the failures → change ONE thing → eval again → compare
```

Absolutely current. This is still how Anthropic recommends you work.

## What the Academy does

Introduces `PromptEvaluator(max_concurrent_tasks=5)` and runs the loop through it.

## What changed

Nothing was deprecated. One thing needs saying clearly, because the lesson does not:

> **`PromptEvaluator` is course scaffolding. It is not part of the Claude SDK.**

There is no `PromptEvaluator` in `anthropic` or `@anthropic-ai/sdk`. It is a helper
class the course author wrote, and `max_concurrent_tasks` is its own constructor
argument, not an API parameter. If you go looking for it in the SDK reference you will
not find it, and that confusion is a real cost of the lesson as written.

Current Anthropic evaluation documentation demonstrates the loop directly, with
ordinary code. This repository does the same: `shared/typescript/eval.ts` and
`shared/python/course/evals.py` are ~150 lines you could delete and rewrite.

### The second addition: hold cases out

If you tune a prompt against every case you own, you have fitted the prompt to the
dataset, and your score no longer predicts anything. Current guidance is explicit about
keeping representative and held-out cases.

This lesson uses:

- **train** — `assets/eval/support-emails.json` (6 cases). You may look at these.
- **held-out** — `assets/eval/support-emails-heldout.json` (4 cases). Scored, never
  read while editing the prompt.

Two of the held-out cases are traps for the specific edits in `PROMPT_V2`:
`held-urgent-but-not` shouts URGENT about a feature request, and
`held-order-word-only` contains the _word_ "order" but no identifier.

## The current implementation

Runs `PROMPT_V1` and `PROMPT_V2` against both splits and prints a 2×2:

```
              train    held-out
prompt v1     ...      ...
prompt v2     ...      ...
```

A v2 that improves on train and collapses on held-out is a prompt fitted to the
training set. That is the failure this lesson exists to make visible.

## Python vs TypeScript

Identical.

## Run it

```bash
npm run lesson -- 15
uv run lesson 15
```

Twenty calls on the cheap model (10 cases × 2 prompts).

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Create strong empirical evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- [Prompt engineering overview](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview)
