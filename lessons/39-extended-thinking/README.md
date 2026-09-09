# 39 · Extended thinking

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 39, _Extended thinking_
>
> **2026 status: 🔴 Breaking API change — `budget_tokens` returns a 400**

Along with lessons 6 and 8, one of the three lessons whose code does not run.

## What the lesson teaches

Let the model reason before answering, and pay for that reasoning in tokens. The
concept is completely current — reasoning is now on by _default_.

## What the Academy does

```python
thinking={"type": "enabled", "budget_tokens": 5000}
```

## What changed

`budget_tokens` was **removed**, not softened.

| Model                                             | `thinking`                                | `budget_tokens`                                             | Omitting `thinking`                                                     |
| ------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| Sonnet 5, Opus 5, Opus 4.8, Opus 4.7, Fable 5/5.1 | `{"type": "adaptive"}`                    | **400**                                                     | Opus 5 and Sonnet 5 run adaptive; Opus 4.7/4.8 run **without** thinking |
| Opus 4.6, Sonnet 4.6                              | `{"type": "adaptive"}` recommended        | deprecated, still works                                     | no thinking — set it explicitly                                         |
| Haiku 4.5 and older                               | `{"type": "enabled", "budget_tokens": N}` | **required** for thinking; min 1024, must be `< max_tokens` | no thinking                                                             |

So the Academy line still works on Haiku 4.5 and fails on the model this repository
defaults to. That is the shape of the change: a hard cutover at the 4.7 generation.

### What replaces it

**Adaptive thinking** decides _when_ and _how much_ to think, per request. You control
the overall budget with **effort**:

```python
response = client.messages.create(
    model="claude-sonnet-5",
    max_tokens=16000,
    thinking={"type": "adaptive", "display": "summarized"},
    output_config={"effort": "high"},   # low | medium | high | xhigh | max
    messages=[...],
)
```

`effort` lives **inside `output_config`**, not at the top level. Default is `high`.

> **`effort` is not universal.** `claude-haiku-4-5` rejects it outright with
> `400 This model does not support the effort parameter.` — verified live. It is accepted
> on Sonnet 4.6, Sonnet 5, Opus 4.6+ and the Fable family. `supportsEffort()` /
> `supports_effort()` in `shared/*/config` encode this, and lesson 64 shows why it
> matters: a router mixes models by design.

### Three things that surprise people

1. **`display` defaults to `"omitted"`** on Sonnet 5, Opus 5, Opus 4.7/4.8 and the
   Fable family. The thinking blocks are present and billed; their text is empty. A UI
   streaming thinking text without asking for `"summarized"` shows a long pause, not a
   bug. This changed from Opus 4.6 / Sonnet 4.6, where the default was `"summarized"`.
2. **The raw chain of thought is never returned.** `"summarized"` gives you a summary.
3. **Echo thinking blocks back unchanged** when you continue a conversation on the same
   model. `messages.append({"role": "assistant", "content": response.content})` —
   lesson 26 again.

### And what effort is not

**`effort` is not a replacement for `temperature`.** It controls reasoning depth and
token spend; it has nothing to do with randomness. If you reached for `effort: "high"`
because you used to reach for `temperature=0.2`, see lesson 6.

## The current implementation

- `example.*` — the same hard problem at `low`, `high` and `max` effort, printing
  thinking summaries, output tokens and wall-clock for each, plus a run with `display`
  left at its default so the empty-thinking-text surprise is visible rather than
  described.
- `legacy.*` — the Academy call, preserved. Expected to 400 on a current model; it
  prints the error and names the model where it would still work.

## Python vs TypeScript

Identical.

## Run it

```bash
npm run lesson -- 39
uv run lesson 39

npm run lesson -- 39 legacy
uv run lesson 39 legacy
```

**This is the most expensive lesson in the repository.** `max` effort on a hard problem
generates a lot of thinking tokens. Pass `--efforts low,high` to cut it down.

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [Effort](https://platform.claude.com/docs/en/build-with-claude/effort)
- [Extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)
- [Migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide)
