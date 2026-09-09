# 59 · Claude Code in action

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 59, _Claude Code in action_
>
> **2026 status: 🟡 Mostly current**

## What the lesson teaches

Point Claude Code at a repository, let it explore, and give it project context so it
stops rediscovering the same facts. `/init` generates a `CLAUDE.md`; the file is read
into every session.

All still true.

## What changed

Nothing was removed. Two refinements:

1. **`/memory` is how you edit memory now.** It opens the memory files for editing and
   shows you which ones are in scope. `/init` still generates the initial project
   `CLAUDE.md`; treat older ad-hoc "memory shortcuts" from the course as superseded by
   `/memory` and the file itself.
2. **Memory has a hierarchy**, and knowing it prevents the most common confusion —
   "why is Claude Code ignoring my instruction?" usually means it is in the wrong file:

   | File                  | Scope                        | Committed? |
   | --------------------- | ---------------------------- | ---------- |
   | `./CLAUDE.md`         | this project, everyone on it | yes        |
   | `./CLAUDE.local.md`   | this project, just you       | no         |
   | `~/.claude/CLAUDE.md` | every project, just you      | no         |
   | managed settings      | your organisation            | by IT      |

   Files are combined, with the more specific taking precedence.

### What actually makes a good `CLAUDE.md`

This repository's own experience, which the lesson does not cover:

- **Facts, not aspirations.** "Tests run with `uv run pytest`" earns its tokens.
  "Write clean code" does not.
- **The non-obvious only.** Anything discoverable from the repo in ten seconds is
  wasted context. The build command, the deploy path, the one directory that is
  generated and must not be edited — those are worth writing down.
- **Keep it short.** It is prepended to every session; it is a prompt, and it competes
  for attention with the actual task.
- **Record the traps.** "Migrations are not reverted by a rollback" is exactly the kind
  of thing an agent gets wrong once, expensively.

## The current implementation

No script — the lesson is about using an interactive tool, and a wrapper around it would
teach nothing.

What this repository _does_ give you is a worked example: it ships a `CLAUDE.md` at the
root describing how to run the lessons, which model defaults apply, and the traps
(`legacy.*` files are meant to fail; `assets/cache/` is generated). Read it as the
artefact this lesson produces.

## Run it

```bash
cd building-with-the-claude-api
claude
```

Then, inside the session:

```
/init      # generate a project CLAUDE.md
/memory    # edit memory files and see which are in scope
/help      # the current command list
```

## Environment variables

None (Claude Code manages its own authentication — lesson 58).

## References

- [Claude Code memory](https://code.claude.com/docs/en/memory)
- [Claude Code quickstart](https://code.claude.com/docs/en/quickstart)
- [Common workflows](https://code.claude.com/docs/en/common-workflows)
