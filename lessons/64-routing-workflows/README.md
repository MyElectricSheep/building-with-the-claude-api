# 64 · Routing workflows

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 64, _Routing workflows_
>
> **2026 status: 🟢 Current — and more useful than it was**

## What the lesson teaches

Classify the input, then send it down a specialised path:

```
request → classifier ─┬→ support
                      ├→ technical
                      └→ billing
```

Each branch gets a prompt written for one job, instead of one prompt hedging across all
of them.

## What changed

Nothing was deprecated. What changed is **how much a branch can differ**.

In 2026 the branches do not have to be different prompts. They can differ in:

| Dimension                | Example                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Model**                | FAQ → Haiku. Ambiguous escalation → Opus                                                                     |
| **Effort**               | `output_config: {effort: "low"}` for classification, `high` for the hard branch                              |
| **Tools**                | only the billing branch gets `issue_refund`                                                                  |
| **Skills / MCP servers** | the legal branch loads the legal skill; the ops branch mounts the runbook MCP server                         |
| **Whole agents**         | on Managed Agents, each branch is a persisted agent with its own model, system prompt, tools and permissions |

That last row is what makes routing _more_ useful now: the router picks not just a
prompt but an entire capability envelope — including which tools exist at all, which is a
security property, not just a cost one.

### The three rules that make routing work

1. **The router must be cheap.** It runs on every request. Cheap model, tiny
   `max_tokens`, `output_config.format` with an `enum`, `effort: "low"`. If the router
   costs as much as the branch, you have built an expensive detour.
2. **The router must be constrained.** An `enum` under a JSON Schema cannot return
   "billing/support" or "I think it might be technical". Free text can.
3. **There must be a fallback.** Real traffic contains things your categories do not
   cover. A router with no `other` branch silently misroutes them, and you find out from
   a customer.

## The current implementation

Routes support messages to four branches, each with a **different model, effort, tool
set and prompt** — so the "branches differ by more than wording" claim is visible in
the code rather than described:

| Branch  | Model   | Effort | Tools                       |
| ------- | ------- | ------ | --------------------------- |
| `faq`   | cheap   | low    | none                        |
| `order` | cheap   | low    | `lookup_order`              |
| `bug`   | default | high   | none                        |
| `other` | default | medium | none — escalates to a human |

It prints the routing decision, the branch's configuration and the answer for each
message, plus the router's own token cost so you can see how small it is.

It also routes a deliberately **out-of-scope** message, so the fallback fires.

## Python vs TypeScript

Identical.

## Run it

```bash
npm run lesson -- 64
uv run lesson 64
```

Two calls per message (route + handle).

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Building effective agents](https://www.anthropic.com/research/building-effective-agents)
- [Effort](https://platform.claude.com/docs/en/build-with-claude/effort)
- [Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview)
