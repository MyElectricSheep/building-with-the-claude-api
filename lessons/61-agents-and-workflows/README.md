# 61 · Agents and workflows

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 61, _Agents and workflows_
>
> **2026 status: 🟢 Current — one option is missing**

## What the lesson teaches

The distinction the rest of the module rests on:

```
You know the sequence of steps      →  WORKFLOW
You know the goal and the tools,
but not the sequence                →  AGENT
```

And the **evaluator-optimizer** pattern:

```
generate → evaluate → pass? → done
              ↓ no
           feedback → generate again
```

Both are still excellent. Nothing here is deprecated.

## What changed

Nothing was removed. What is missing is a fourth option the course could not have had.

### Four ways to build an agent

Two independent questions separate them: **who writes the loop**, and **who hosts it**.

| Approach                    | You write                                  | Loop                            | Hosting       | Tools                             |
| --------------------------- | ------------------------------------------ | ------------------------------- | ------------- | --------------------------------- |
| **Manual loop** (lesson 27) | the `while stop_reason == "tool_use"` loop | you                             | you           | yours                             |
| **Tool Runner**             | just the tool functions                    | the SDK                         | you           | yours                             |
| **Claude Agent SDK**        | a prompt + options                         | the SDK (Claude Code's harness) | you           | built-in file/bash/grep/web + MCP |
| **Managed Agents**          | an agent config                            | **Anthropic**                   | **Anthropic** | hosted sandbox + Skills + MCP     |

Only the last one hosts anything. That is the axis people miss: the Tool Runner and the
Agent SDK both give you a harness and leave deployment entirely to you.

**Managed Agents** is a persisted, versioned agent object plus per-session containers,
an event stream, memory, permission policies, and scheduled runs. It is the right answer
for a long-running or scheduled agent, and the wrong answer for a single classification.

It does **not** replace the Messages API loop. They are different surfaces:

```
Messages API   → maximum control, you implement the loop
Managed Agents → higher-level, Anthropic runs the loop and hosts the sandbox
```

### And the part that did not change

An agent is more expensive, slower, and less predictable than a workflow. Before
building one, check all four:

- **Complexity** — is the task genuinely hard to specify in advance?
- **Value** — does the outcome justify the cost and latency?
- **Viability** — is the model actually good at this task?
- **Cost of error** — can mistakes be caught and undone?

A "no" on any of them means drop down a tier. Lesson 67 makes this a function.

## The current implementation

The **evaluator-optimizer** loop, run for real: write an incident retrospective from raw
notes, grade it against an explicit rubric with a _different_ model, feed the failures
back, and iterate until it passes or the round limit is hit.

It prints each round's verdict and the specific gaps, so you can watch the draft
improve — and it stops on a round limit, because "loop until the grader is happy" with
no bound is a way to spend money.

Two details worth copying:

- The evaluator returns **structured output** with an explicit `pass`/`fail` per rubric
  item, not a number. A score of 7 tells you nothing actionable.
- The optimizer is given the **failed items only**, not the whole rubric again.

## Python vs TypeScript

Identical.

## Run it

```bash
npm run lesson -- 61
uv run lesson 61

npm run lesson -- 61 -- --max-rounds 2
```

Costs a few calls per round on the cheap model plus one judge call on the default model.

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Building effective agents](https://www.anthropic.com/research/building-effective-agents)
- [Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview)
- [Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
