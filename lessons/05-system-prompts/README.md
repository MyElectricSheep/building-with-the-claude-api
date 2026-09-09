# 05 · System prompts

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 5, _System prompts_
>
> **2026 status: 🟢 Current**

## What the lesson teaches

`system` is a **top-level request parameter**, not a message with `role: "system"`. It
sets role, tone, constraints and output expectations for the whole conversation.

## What the Academy does

```python
client.messages.create(
    model=...,
    max_tokens=...,
    system="You are a helpful assistant.",
    messages=[...],
)
```

Still exactly right.

## What changed

Nothing was removed. Three additions matter:

1. **`system` also accepts a list of content blocks.** That is how you attach
   `cache_control` to a large, stable instruction block (lesson 43) or turn a system
   document into a citable source.

   ```python
   system=[{"type": "text", "text": BIG_INSTRUCTIONS,
            "cache_control": {"type": "ephemeral"}}]
   ```

2. **Mid-conversation system messages.** On supporting models you can append
   `{"role": "system", "content": "..."}` to `messages` for an operator instruction that
   arrives _during_ a conversation — a mode switch, injected state. Editing the
   top-level `system` instead would invalidate the cached prefix. It must follow a user
   message and cannot be `messages[0]`. Unsupported models return a 400.

3. **System prompt ≠ user input.** With current models it is worth being explicit that
   text you interpolate from users is _data_, not instructions. The example shows the
   JSON-delimiting pattern the eval lessons reuse.

## The current implementation

Runs the same user question under two different system prompts so the effect is
visible, then shows the block form with a cache breakpoint.

## Python vs TypeScript

Identical. In TypeScript the block form is `Anthropic.TextBlockParam[]`.

## Run it

```bash
npm run lesson -- 05
uv run lesson 05
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Working with the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)
- [System prompts / prompt engineering](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview)
- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
