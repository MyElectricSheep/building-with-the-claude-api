# 63 · Chaining workflows

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 63, _Chaining workflows_
>
> **2026 status: 🟢 Current — with one 2026 optimisation for a specific case**

## What the lesson teaches

Break a task into stages, where each stage's output is the next stage's tightly
constrained input:

```
extract → draft → validate → polish
```

Two reasons it beats one big prompt, and the second is the one that matters:

- each stage gets a **focused prompt**;
- you can put **code between the stages** — a schema check, a business rule, an
  early exit. That is the part a single prompt cannot give you at any price.

## What changed

Nothing. Chaining is still good architecture and still the right default for a knowable
sequence.

One optimisation exists now for a **specific** shape of chain — a chain of _tool calls_:

```
search_customer() → get_orders() → get_order_items() → calculate_total() → compare()
```

In an agent loop, each hop is a model round trip and every intermediate result lands in
the context window. **Programmatic tool calling** lets Claude write code that calls your
tools from inside the code-execution sandbox, so only the final result comes back:

```python
tools=[
    {"type": "code_execution_20260120", "name": "code_execution"},
    {..., "allowed_callers": ["code_execution_20260120"]},   # on YOUR tool
]
```

Not compatible with `strict: true`, forced `tool_choice`, or
`disable_parallel_tool_use`. Availability is model-gated (Opus 4.5+ / Sonnet 4.5+).

**This does not replace workflow chaining.** It collapses low-level _tool_ chains inside
one turn. A chain whose stages are prompts with code between them stays exactly as the
lesson describes.

## The current implementation

A four-stage chain over the incident notes, with **real gates between the stages**:

| Stage                | Model   | Gate after it                                                                             |
| -------------------- | ------- | ----------------------------------------------------------------------------------------- |
| 1. extract facts     | cheap   | schema-valid, and every timestamp matches `HH:MM`                                         |
| 2. classify severity | cheap   | severity must be one of the allowed values, and SEV1 must be justified by a stated reason |
| 3. draft retro       | cheap   | word count within bounds, no banned filler                                                |
| 4. propose actions   | default | at least two actions, each with an owner-shaped field                                     |

A gate failing **stops the chain and says which one** — no stage runs on input the
previous gate rejected. That early exit is worth more than the token saving.

## Python vs TypeScript

Identical.

## Run it

```bash
npm run lesson -- 63
uv run lesson 63
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Building effective agents](https://www.anthropic.com/research/building-effective-agents)
- [Programmatic tool calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
