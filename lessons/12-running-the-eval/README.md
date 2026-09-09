# 12 · Running the eval

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 12, _Running the eval_
>
> **2026 status: 🟡 Current design, inherited problems**

## What the lesson teaches

Decompose the runner:

```
run_prompt(input)          -> one model call
run_test_case(case)        -> call + grade one case
run_eval(dataset)          -> map over the dataset, aggregate
```

That decomposition is good, matches modern eval guidance, and does not need
replacing.

## What the Academy does

Exactly the above, on top of the shared `chat()` helper.

## What changed

The architecture is fine. What breaks is **inherited**: if `chat()` still carries
`temperature=1.0` (lesson 11), every call this runner makes fails. Fix the helper.

Beyond that, four things are worth adding to a 2026 runner. All four are in the shared
harness:

1. **Bounded concurrency.** A dataset fans out; your rate limit does not. Five in
   flight is a sane default.
2. **Per-case error isolation.** One 429 or one refusal must not abandon the run. A
   failed case is recorded as `errored`, kept out of the mean, and reported separately
   — an errored case is not a failing case, and conflating them silently inflates or
   deflates your score.
3. **Don't hand-roll retries.** The SDKs already retry 408/409/429/5xx with exponential
   backoff (`max_retries`, default 2). Add your own only for behaviour the SDK does not
   provide.
4. **Refuse to score unreviewed data.** Cases generated in lesson 11 carry
   `reviewed: false`. This runner skips them unless you pass `--include-unreviewed`,
   so a generated dataset cannot quietly become your benchmark.

## The current implementation

Runs the hand-labelled dataset, plus any reviewed cases from
`assets/eval/generated.json`, and prints timings alongside scores. Pass
`--include-unreviewed` to see what the guard is protecting you from.

## Python vs TypeScript

The concurrency primitive differs — promise pool vs `ThreadPoolExecutor` — and both are
unit-tested for order preservation and for never exceeding the limit.

## Run it

```bash
npm run lesson -- 12
uv run lesson 12

npm run lesson -- 12 -- --concurrency 1 --include-unreviewed
uv run lesson 12 -- --concurrency 1 --include-unreviewed
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Create strong empirical evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- [Errors and retries](https://platform.claude.com/docs/en/api/errors)
