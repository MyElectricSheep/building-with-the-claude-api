# 06 · Temperature

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 6, _Temperature_
>
> **2026 status: 🔴 Deprecated — the parameter is gone, the idea is not**

This is the first lesson where following the course verbatim gives you an error rather
than a worse answer.

## What the lesson teaches

A sampling knob: low `temperature` for deterministic, conventional answers; high
`temperature` for varied, exploratory ones. Same for `top_p` and `top_k`.

## What the Academy does

```python
message = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1000,
    temperature=0.2,
    messages=[...],
)
```

## What changed

`temperature`, `top_p` and `top_k` are **deprecated as of Claude Opus 4.7**. On
Claude 4.7 and later models, a **non-default value returns a 400**.

There are two distinct failure modes, and which one you hit depends on your SDK:

|                                           | What happens                                                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Python SDK v1.0+**                      | The parameters were removed from the method signature. `temperature=0.2` raises `TypeError` **before any HTTP request is made**.                      |
| **TypeScript SDK**                        | The parameters are still in the request types for backwards compatibility, so it compiles. The **API** rejects it with a 400 `invalid_request_error`. |
| **Older models** (Sonnet 4.6 and earlier) | Still accepted. The deprecation is scoped to 4.7-and-later, not retroactive.                                                                          |

If you followed this lesson and got a confusing error, _your Python was fine_ — you were
following an API generation the current SDK has moved past.

### What replaces it

**Prompting.** Anthropic's deprecation note is explicit: omit the parameters and steer
behaviour with instructions.

| Instead of        | Say                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `temperature=0.1` | "Respond conservatively. Prioritise the most likely, well-supported answer. Avoid speculation."                            |
| `temperature=1.0` | "Generate five substantially different possibilities. Explore unusual approaches; avoid converging on the obvious answer." |

### What does _not_ replace it

`output_config.effort` is **not** a temperature substitute. Effort controls how much
reasoning the model spends; it is a compute/quality dial, not a randomness dial. Do not
reach for `effort: "high"` because you used to reach for `temperature=0.2`.

There is no exact one-to-one replacement, because there is no longer a
randomness knob to turn. If you genuinely need _sampling_ diversity — n independent
answers to the same prompt — issue n requests; they will differ.

## The current implementation

- `example.*` — the same question asked twice, steered by prompt instead of by
  parameter, then a diversity demo that issues independent requests.
- `legacy.*` — the Academy call, preserved. It is expected to fail, and it prints the
  exact error you should expect on each SDK.

## Python vs TypeScript

This is the clearest case in the course where the two SDKs fail differently. Python
fails locally with `TypeError`; TypeScript compiles and fails at the API with a 400.
`legacy.py` and `legacy.ts` demonstrate each.

## Run it

```bash
npm run lesson -- 06          # current approach
uv run lesson 06

npm run lesson -- 06 legacy   # the deprecated call, and the error it produces
uv run lesson 06 legacy
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Model and parameter deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)
- [Migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide)
- [Prompt engineering overview](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview)
- [Effort](https://platform.claude.com/docs/en/build-with-claude/effort) — related, but _not_ a temperature replacement
