# 66 · Environment inspection

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 66, _Environment inspection_
>
> **2026 status: 🟢 Very current**

## What the lesson teaches

The question that separates an agent that works from one that looks like it works:

> **How will Claude know whether its action succeeded?**

```
observe → reason → act → OBSERVE THE RESULT → reason → act
```

not

```
reason → act → act → act → assume success
```

An agent without observable feedback is not an agent. It is a script that improvises.

## What changed

Nothing about the principle. What is new is how concrete the API makes it — and one
correction to a common reading of the lesson.

### Inspection is not "take a screenshot"

The screenshot loop is one instance of a general pattern. The right observation depends
on the environment:

| Environment | Observation                                       |
| ----------- | ------------------------------------------------- |
| filesystem  | read the file back, `stat` it, list the directory |
| API         | the structured response, and the status code      |
| code        | run the tests, the linter, the build              |
| database    | query for the row you claim to have written       |
| browser     | page state, DOM-level tools                       |
| desktop     | a screenshot                                      |

Reaching for a screenshot when you could read the file back is a worse loop, not a more
sophisticated one — it is lossier and far more expensive in tokens.

### Computer use and browser use are client toolsets now

```json
{ "type": "computer_toolset_20260801" }
{ "type": "browser_toolset_20260801" }
```

Both are **client toolsets**: one entry in `tools` declares a fixed set of member tools
whose names and schemas Anthropic defines, and **your application executes every call**.
`computer_toolset_20260801` is the stable successor to the beta `computer_20251124` and
`computer_20250124`; `browser_toolset_20260801` is the first browser version.

Things that bite:

- The entry takes **no `name`** — the dated `type` fixes the member names.
- A member call arrives with `toolset_name` (`computer` or `browser`) alongside `name`.
  **Dispatch on the pair** — both toolsets have a `screenshot`, and a custom tool may
  share a name.
- `strict: true`, `input_examples`, forced `tool_choice`, and programmatic tool calling
  are all rejected on a toolset entry.
- A `tool_result` image that exceeds the model's resolution limits is **rejected**, not
  downscaled. Resize before returning it (lesson 40).

## The current implementation

The same task — fix a bug in a sandboxed file — run two ways:

1. **blind**: act, then declare success
2. **inspecting**: act, then **read the file back and run the code**, and feed the real
   result to the model

**The blind agent often succeeds, and that is not the point.** On the run this repository
was verified against, both agents ended with `PASS: all checks`. A lesson that needed the
blind one to fail would be a rigged one.

What differs is what each agent _knew_. The blind agent asserted success. The inspecting
agent saw `FAIL`, kept going, and stopped on evidence. The only reason you know whether
the blind agent was right is the `ACTUAL:` line — which the script computes by running
the code itself, after the agent has finished. In production nobody runs that line for
you.

The observation here is running the file, not a screenshot — which is the point of the
correction above.

## Python vs TypeScript

Python verifies by executing the fixed module in a subprocess. TypeScript does the same
with `node`. Both use the sandboxed editor from lesson 30, so nothing escapes
`assets/sandbox/`.

## Run it

```bash
npm run lesson -- 66
uv run lesson 66
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Computer use tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)
- [Browser use tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool)
- [Tool reference — client toolsets](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference)
- [Building effective agents](https://www.anthropic.com/research/building-effective-agents)
