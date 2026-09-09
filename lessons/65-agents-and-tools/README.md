# 65 · Agents and tools

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 65, _Agents and tools_
>
> **2026 status: 🟡 Good — with one teaching point that is too absolute**

## What the lesson teaches

Give an agent a small set of **composable primitives** rather than a large set of
task-specific verbs. Claude Code's own toolset is the argument:

```
bash  read  write  edit  glob  grep
```

not

```
refactor_project()  upgrade_react()  fix_bug()
```

Six primitives compose into thousands of tasks; three verbs do three things and fail at
everything adjacent.

## What changed

The observation is correct **for coding agents and open-ended environments**. What it
must not become is:

> the more generic a tool is, the better.

In a domain with consequences, the opposite is often right. Consider finance:

```
bash(command)                      -- catastrophically broad
```

versus

```
get_invoice(invoice_id)
approve_invoice(invoice_id, maximum_amount)
issue_refund(transaction_id, amount, reason)
```

The narrow set gives you **authorisation, observability and a permission boundary**.
`bash` gives you none of those, and no amount of prompting adds them.

### Four things that shifted the trade-off since the course

|                                          | Effect                                                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`strict: true`**                       | narrow schemas are now _enforced_, so a specific tool costs less reliability than it used to (lesson 23)                                                            |
| **Tool search**                          | up to 10,000 deferred tool definitions, so a large catalogue no longer bloats the prompt. `defer_loading: true` also keeps them out of the cache prefix (lesson 28) |
| **Programmatic tool calling**            | narrow tools can be composed _by the model in code_, recovering some of the composability argument (lesson 63)                                                      |
| **Permission policies** (Managed Agents) | allow/deny/confirm per tool — only meaningful if the tools are granular enough to have different policies                                                           |

### The replacement rule

> **Make tools composable and semantically clear, with the narrowest authority
> appropriate to what they can change.**

Which decomposes into a question you can actually answer per tool:

| Ask                                                      | If the answer is…                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| What is the worst thing one call can do?                 | irreversible → make it narrow, and require the constraint as an argument |
| Would you let a new hire run it unsupervised on day one? | no → it needs an approval gate, which needs a narrow schema              |
| Can you tell from the audit log what happened?           | not from `bash("...")` you cannot                                        |
| Does it compose with the others?                         | if not, you have a verb, not a primitive                                 |

## The current implementation

The same task — "refund the duplicate charge on order A-77210, but only up to €50" —
given to two agents:

1. a **broad** agent with one `run_query(sql)` tool
2. a **narrow** agent with `get_charge`, `issue_refund(transaction_id, amount, reason)`
   where the amount is schema-bounded, and an approval gate on refunds above a threshold

Both are asked to do the job **and** an over-limit refund. The narrow agent's tool
_cannot_ express the over-limit action; the broad agent's can, and the only thing
stopping it is the prompt.

It prints the audit log each agent produced, which is the clearest form of the argument:
one log says what happened, the other says a SQL string was run.

> The `run_query` tool executes against a tiny **in-memory** table, not a database.
> Nothing here touches a real system.

## Python vs TypeScript

Identical.

## Run it

```bash
npm run lesson -- 65
uv run lesson 65
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Agent design](https://www.anthropic.com/research/building-effective-agents)
- [Strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use)
- [Tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)
- [Managed Agents — permission policies](https://platform.claude.com/docs/en/managed-agents/permission-policies)
