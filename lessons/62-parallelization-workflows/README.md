# 62 · Parallelization workflows

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 62, _Parallelization workflows_
>
> **2026 status: 🟢 Current — and now one layer of three**

## What the lesson teaches

Fan out, work in parallel, aggregate:

```
              ┌→ specialist A ─┐
input ────────┼→ specialist B ─┼→ aggregator → answer
              └→ specialist C ─┘
```

Two things this buys you, and only one of them is speed:

- **latency** — three calls at once take as long as the slowest, not the sum;
- **quality** — each specialist gets a focused prompt and a clean context, instead of one
  prompt trying to do three jobs.

The second one is why the pattern survives even when latency does not matter.

## What changed

Nothing. What is worth adding is that "parallelism" now means three different things,
at three different layers, and they compose.

### A. Parallel API requests — what this lesson teaches

Your application issues several independent requests.

```ts
const [security, performance, accessibility] = await Promise.all([...]);
```

You control the fan-out, the prompts and the aggregation. Bound the concurrency
(`shared/*/eval` has the primitive) — your rate limit is not infinite.

### B. Parallel tool calls — inside one turn

One assistant turn can contain several `tool_use` blocks, and Claude 4 models do this by
default. **You** execute them concurrently and return every result in one user message.
See lesson 28 — including the trap where splitting the results across messages trains
the model to stop batching.

### C. Parallel agents — separate contexts

Managed Agents can run context-isolated sub-agents concurrently, each with its own model,
tools and system prompt, reporting to a coordinator. That is the right shape when a
sub-task would otherwise fill the main agent's context with reading.

```
Coordinator
   ├→ security agent
   ├→ docs agent
   └→ tests agent
          ↓
     Coordinator → result
```

| Layer                  | You orchestrate                | Isolation                     |
| ---------------------- | ------------------------------ | ----------------------------- |
| A. parallel requests   | yes                            | full — separate conversations |
| B. parallel tool calls | you execute, the model batches | none — same context           |
| C. parallel agents     | Anthropic                      | full — separate contexts      |

## The current implementation

Three specialists analyse the same incident notes — **timeline**, **detection**,
**process/comms** — then an aggregator merges them into one retrospective.

It runs the fan-out **twice**, sequentially and concurrently, and prints wall-clock for
each, so the latency claim is a measurement rather than an assertion. Each specialist
returns structured output, so the aggregator merges _data_, not prose.

## Python vs TypeScript

`Promise.all` versus a `ThreadPoolExecutor`. Both bound the concurrency.

## Run it

```bash
npm run lesson -- 62
uv run lesson 62
```

Eight calls on the cheap model (3 specialists × 2 runs + 2 aggregations).

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Building effective agents](https://www.anthropic.com/research/building-effective-agents)
- [Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [Managed Agents — multi-agent orchestration](https://platform.claude.com/docs/en/managed-agents/multiagent-orchestration)
