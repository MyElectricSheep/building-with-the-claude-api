# 03 · Making a request

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 3, _Making a request_
>
> **2026 status: 🟡 Mostly current**

## What the lesson teaches

The one call the whole course is built on:

```
client.messages.create(model=..., max_tokens=..., messages=[...])
```

`messages` is a list of `{role, content}` turns. The response carries `content`,
`stop_reason`, `usage`, and `model`.

## What the Academy does

```python
message = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1000,
    messages=[{"role": "user", "content": "What is quantum computing?"}],
)
print(message.content[0].text)
```

## What changed

| Academy                     | 2026                             | Why                                                                                             |
| --------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------- |
| `model="claude-sonnet-4-5"` | `claude-sonnet-5`                | 4.5 still works but is a generation behind                                                      |
| `message.content[0].text`   | Filter on `block.type == "text"` | Current models run **adaptive thinking**, so `content[0]` is often a `thinking` block, not text |
| Ignore `stop_reason`        | Check it                         | `max_tokens`, `refusal`, `pause_turn` all produce a 200 response with no usable text            |

The request shape itself has not changed at all. `Anthropic()`, `messages.create`,
`model`, `max_tokens`, `messages` are exactly as taught.

## The current implementation

Both implementations:

1. build the request with the model from `shared/*/config`,
2. print the **block-type census** so you can see for yourself what came back,
3. check `stop_reason` before reading text,
4. print `usage`.

The block census is the point of this lesson in 2026 — run it once and the
`content[0]` habit dies on its own.

## Python vs TypeScript

In TypeScript, `response.content` is a discriminated union (`ContentBlock[]`).
`content[0].text` is a **compile error** until you narrow on `.type`. Python has no such
guard rail, which is exactly why the Academy's notebook pattern survived so long.

## Run it

```bash
npm run lesson -- 03
uv run lesson 03

# Ask your own question
npm run lesson -- 03 -- "Explain BM25 in two sentences"
uv run lesson 03 -- "Explain BM25 in two sentences"

# The preserved Academy pattern, and what it does on a current model
npm run lesson -- 03 legacy
uv run lesson 03 legacy
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Working with the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)
- [Messages API reference](https://platform.claude.com/docs/en/api/messages/create)
- [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
