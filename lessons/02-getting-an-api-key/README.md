# 02 · Getting an API key

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 2, _Getting an API key_
>
> **2026 status: 🟢 Current**

## What the lesson teaches

Create a key in the Claude Console, put it in an environment variable, and keep it out
of your source tree.

## What the Academy does

Walks through the Console UI and `export ANTHROPIC_API_KEY=...`. Still accurate.

## What changed

Nothing was deprecated. Two things were _added_:

1. **`ant auth login`** — the Anthropic CLI stores an OAuth profile under
   `~/.config/anthropic/`, and every SDK picks it up automatically. A bare
   `Anthropic()` works with no environment variable set.
2. **Credential resolution order**, first match wins:
   `ANTHROPIC_API_KEY` → `ANTHROPIC_AUTH_TOKEN` → the active `ant auth login` profile →
   Workload Identity Federation env vars → the default profile on disk.

   So an unset `ANTHROPIC_API_KEY` does **not** necessarily mean you have no
   credentials. `ant auth status` tells you which source is active.

For this course, a plain `ANTHROPIC_API_KEY` in `.env` is the simplest route, and it is
what the lesson runner loads.

## The current implementation

There is nothing to "implement" here, so the example is a **doctor**: it reports which
credentials are configured and whether the repository can reach the API — **without
printing any secret**. It prints only a masked fingerprint (first 8 and last 4
characters), never the key.

## Python vs TypeScript

Identical behaviour. Both read `process.env` / `os.environ`; neither writes anything.

## Run it

```bash
npm run lesson -- 02
uv run lesson 02
```

## Environment variables

- `ANTHROPIC_API_KEY` (checked, not required — the doctor reports its absence)
- `VOYAGE_API_KEY` (checked; only lessons 34/36/38 need it)

## References

- [Claude Console — API keys](https://platform.claude.com/settings/keys)
- [Voyage AI dashboard](https://dashboard.voyageai.com/)
- [Client SDKs](https://platform.claude.com/docs/en/api/client-sdks)
