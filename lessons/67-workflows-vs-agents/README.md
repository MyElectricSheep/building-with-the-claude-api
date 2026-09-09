# 67 · Workflows vs agents

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 67, _Workflows vs agents_
>
> **2026 status: 🟢 Current — the best engineering advice in the course**

## What the lesson teaches

Prefer a workflow when the sequence is knowable. Reach for an agent only when the task
genuinely requires flexible planning.

```
Can you define the process?
   ├─ yes → workflow
   └─ no
       ↓
   Does the model need to decide what actions to take?
       ├─ yes → agent
       └─ no  → a simpler workflow, or one API call
```

A workflow is testable, predictable, cheaper and debuggable. An agent is none of those,
and buys you adaptability you should be able to name before you pay for it.

## What changed

Nothing about the decision. Two things about the context it is made in — and they push
in opposite directions, which is the interesting part.

**Agents got easier to build.** Tool runner, Claude Agent SDK, Managed Agents with
hosted sandboxes, sessions, memory, permission policies and schedules. What used to be
a month of infrastructure is now configuration.

**That is exactly why the discipline matters more.** When agents were expensive to
build, the cost was the filter. Now the filter has to be judgement. Anthropic ships
permissions, isolated environments and audit trails for managed agents _precisely
because_ autonomy introduces state, permissions and execution complexity — the machinery
exists because the problem is real, not because it went away.

### The four questions, restated as a check you can run

| Question          | Fail condition                                            |
| ----------------- | --------------------------------------------------------- |
| **Complexity**    | You can write the steps down → it is a workflow           |
| **Value**         | The outcome does not justify 5–20× the tokens and latency |
| **Viability**     | You have not measured that the model can do this task     |
| **Cost of error** | A mistake is not catchable or not reversible              |

A "fail" on any of these means drop a tier. That is a function, not a vibe — and this
lesson implements it.

### And the tier below the one you were about to pick

| Tier                  | Use when                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| One API call          | Classification, extraction, summarisation, a single answer                                             |
| **Workflow**          | The sequence is knowable — chaining (63), routing (64), parallelization (62), evaluator-optimizer (61) |
| **Agent, your infra** | Sequence genuinely unknown; manual loop (27) or tool runner                                            |
| **Agent, hosted**     | The above, plus long-running, scheduled, or needing a hosted sandbox — Managed Agents                  |

## The current implementation

Two halves:

1. **A decision function**, `recommendTier` / `recommend_tier`, implementing the table
   above. Pure, unit-tested, no API key. Run it over eight real-sounding tasks and it
   tells you which tier and _why_ — including which check failed.
2. **A measured comparison.** The same task — "summarise this incident and propose
   actions" — run as a workflow (the lesson-63 chain) and as an agent (a tool loop with
   the same capabilities), reporting tokens, turns, wall-clock and whether the output
   passed the same gates. The agent usually gets there. The question the numbers answer
   is what it cost to get there the flexible way.

Pass `--decide-only` for the first half with no API key.

## Python vs TypeScript

Identical, with the same unit tests either side.

## Run it

```bash
npm run lesson -- 67
uv run lesson 67

npm run lesson -- 67 -- --decide-only    # no API key needed
uv run lesson 67 -- --decide-only
```

## Environment variables

- `ANTHROPIC_API_KEY` (not needed with `--decide-only`)

## References

- [Building effective agents](https://www.anthropic.com/research/building-effective-agents)
- [Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview)
- [Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
