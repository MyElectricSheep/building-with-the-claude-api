# 01 · Accessing the API

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 1, _Accessing the API_
>
> **2026 status: 🟡 Mostly current**

## What the lesson teaches

Claude is reached over HTTPS. Your application talks to the Claude API; the browser
never does. That means your API key lives on a server (or in a local process like
these lessons), never in client-side JavaScript, and never in a commit.

```
your UI  ──►  your server  ──►  Claude API
              (holds the key)
```

## What the Academy does

Introduces the architecture and shows a first `client.messages.create(...)` call using
`model="claude-sonnet-4-5"`.

## What changed

|                 | Academy                  | 2026                                                                                                                                               |
| --------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model           | `claude-sonnet-4-5`      | Still active, but a generation behind. Use `claude-sonnet-5` (or `claude-opus-5`)                                                                  |
| Key discovery   | `ANTHROPIC_API_KEY` only | The SDKs also resolve `ANTHROPIC_AUTH_TOKEN`, an `ant auth login` profile, and Workload Identity Federation                                        |
| Model discovery | Hardcode a string        | The [Models API](https://platform.claude.com/docs/en/api/models-list) lists what your key can actually reach, with context window and capabilities |

The architecture lesson itself is unchanged and still correct.

## The current implementation

This lesson deliberately spends **zero output tokens**: it calls the Models API instead
of the Messages API. That verifies three things at once — your key is present, it is
valid, and the model this repository defaults to actually exists for your account.

`client.models.list()` auto-paginates in both SDKs, so you iterate the client, not a
`.data` array.

## Python vs TypeScript

Near-identical. The Python SDK exposes `client.models.list()` as an iterable paginator;
the TypeScript SDK returns an async iterable. Neither needs a page loop.

## Run it

```bash
npm run lesson -- 01
uv run lesson 01
```

Expected output: a table of the models your key can use, and a line confirming whether
`CLAUDE_MODEL` is among them.

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Working with the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)
- [Model overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Models API](https://platform.claude.com/docs/en/api/models-list)
- [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)
