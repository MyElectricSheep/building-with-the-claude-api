# 09 · Prompt evaluation

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 9, _Prompt evaluation_
>
> **2026 status: 🟢 Current**

## What the lesson teaches

Stop judging prompts by eyeballing one output. Build a small dataset with known
answers, run the prompt over all of it, and score the results. Then every prompt
change becomes a measurable before/after instead of a vibe.

## What the Academy does

Introduces the idea and the vocabulary — test case, dataset, grader, score. No API
surface to go stale.

## What changed

Nothing was deprecated. Anthropic's current evaluation guidance says the same thing
and adds emphasis on two points the lesson passes over:

1. **Define measurable success criteria first.** "Better" is not a criterion;
   "≥ 90% exact-match on category, over 6 held-out emails" is.
2. **Hold cases out.** If you tune a prompt against every case you own, you have
   fitted the prompt to the dataset. Lesson 15 uses a train/held-out split for
   exactly this reason.

The grader hierarchy is unchanged and still the right default order:

| Grader          | When                                                          |
| --------------- | ------------------------------------------------------------- |
| **Code-based**  | Whenever the answer is checkable. Fast, deterministic, free.  |
| **Model-based** | Nuanced judgements only, with an explicit rubric (lesson 13). |
| **Human**       | Flexible, slow, expensive. Use it to calibrate the other two. |

## The current implementation

The smallest honest eval: six hand-labelled support emails
(`assets/eval/support-emails.json`), one classification prompt, one code grader.

It prints a per-case table and the mean score. That is the whole idea — everything in
lessons 10–15 is this loop with more machinery around it.

The shared pieces live in `shared/typescript/eval.ts` and `shared/python/course/evals.py`.
**They are ordinary application code, not SDK features** — see lesson 15 for why that
distinction matters.

## Python vs TypeScript

The harness differs where the concurrency model does: TypeScript uses a promise pool,
Python uses a `ThreadPoolExecutor` (the sync Anthropic client is thread-safe and the
work is HTTP-bound). Both preserve input order and isolate a failing case.

## Run it

```bash
npm run lesson -- 09
uv run lesson 09
```

Six model calls on the cheap model. Roughly a tenth of a cent.

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Create strong empirical evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
