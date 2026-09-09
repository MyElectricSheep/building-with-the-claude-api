# Working in this repository

A companion to Anthropic's _Building with the Claude API_ Academy course: every coding
lesson implemented twice, in Python and TypeScript, against the **current** API rather
than the one the course was recorded on.

## Commands

```bash
npm install && uv sync --all-extras   # setup

npm run lesson -- 03                  # run a lesson (TypeScript)
uv run lesson 03                      # run a lesson (Python)
npm run lesson -- 06 legacy           # run a preserved deprecated variant

npm run check                         # typecheck + format + tests + repo structure
uv run pytest
uv run ruff check .
```

`npm run check` and `uv run pytest` make **no API calls**. Keep it that way.

## Layout

```
lessons/NN-slug/{README.md, python/, typescript/}
shared/typescript/       shared helpers + their unit tests
shared/python/course/    the same helpers, mirrored
shared/mcp/              stdio entry points for the MCP document server
assets/                  corpus, eval datasets, images, PDF, fixtures
docs/                    MODERNIZATION.md · VERIFICATION.md · MODELS.md · ATTRIBUTION.md
scripts/check-repo.mjs   structural checks
```

## Rules that the tooling enforces

- **Never hardcode a model id** outside `shared/typescript/config.ts` and
  `shared/python/course/config.py`. `scripts/check-repo.mjs` fails the build otherwise.
  `legacy.*` files are the exception — pinning an old model there is the lesson.
- **Every lesson README carries a `**2026 status: <badge>` line**, and that badge must
  match the root `README.md` index _and_ `docs/MODERNIZATION.md`. All three are
  cross-checked.
- **`.env.example` holds no values.** Only names.
- Run commands in a lesson README must name that lesson's own number.

## Things that will look like bugs and are not

- **`legacy.*` files are meant to fail.** `06`, `08`, `39` and `46` demonstrate API
  errors on purpose, and each one detects whether it got the expected failure or an
  unexpected success. Do not "fix" them.
- **`lessons/03/typescript/legacy.ts` has `@ts-expect-error` directives.** Removing them
  is how you see the compile error the lesson is about.
- **`assets/data/buggy_stats.py` and `buggy-stats.mjs` contain deliberate bugs.** Lesson
  66 asks an agent to fix them.
- **`assets/cache/` and `assets/sandbox/` are generated** and git-ignored. So is
  `assets/eval/generated.json` and `outputs/`.
- **MCP lessons print server-side tracebacks to stderr** when demonstrating an error
  path. That is the server reporting, not a crash.

## Conventions

- TypeScript runs directly on Node ≥ 22.18 via type stripping. No build step, no `tsx`.
  That means **no parameter properties, no enums, no namespaces** — `erasableSyntaxOnly`
  is on and will tell you.
- Relative TS imports carry the `.ts` extension.
- Python is `ruff`-clean at 88 columns.
- Prefer `block.type` narrowing over positional access, everywhere. It is half the point
  of the repository.
- New shared logic goes in `shared/` **with a test**. The tests are what let the
  repository claim anything without credentials.

## Before claiming something works

`docs/VERIFICATION.md` distinguishes `STATICALLY VERIFIED` from `LIVE API VERIFIED`.
Do not move a lesson to the second without actually running it, and say which model.

63 of 67 lessons are currently live-verified. The four that are not (34, 35, 36, 38)
need a `VOYAGE_API_KEY`.

**Exit code 0 is not verification.** The live pass found five lessons that exited
cleanly while demonstrating nothing — a rubric that passed on round one, an A/B whose
two runs generated different payloads, a "hard" problem the model found easy. When you
change a lesson, read its _output_ and ask whether the thing it claims actually happened.

**Never fit the data to the model.** When the model disagreed with a gold label, the fix
was to make the labelling rule decidable, not to change the label to match. The
`labelling_rule` field in both eval datasets exists so every label can be argued with.
