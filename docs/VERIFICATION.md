# Verification status

Two badges are used in this repository, and they mean different things:

| Badge                 | Means                                                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STATICALLY VERIFIED` | Type-checks under `tsc --strict`, lints clean under `ruff`, its pure logic is covered by unit tests, and it was executed as far as it goes without credentials. **No live API call was made.** |
| `LIVE API VERIFIED`   | Actually executed end-to-end against the Claude API (and Voyage, where relevant) with real credentials, and its output inspected.                                                              |

Nothing in this file claims a lesson was tested when it was not.

---

## Current state

**Every lesson is `STATICALLY VERIFIED`.** The live pass has not been run: this session
had no `ANTHROPIC_API_KEY` or `VOYAGE_API_KEY`, and using someone's production key
without asking is not a thing to do on your behalf.

### What "statically verified" covered

Run these yourself; they need no credentials and take about ten seconds:

```bash
npm run check    # tsc --noEmit + prettier --check + node --test + scripts/check-repo.mjs
uv run pytest
uv run ruff check .
```

| Check                                         | Covers                                                                                                                                                    |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsc --noEmit` (strict, `erasableSyntaxOnly`) | Every `.ts` file in `lessons/` and `shared/`, including `legacy.ts` files                                                                                 |
| `ruff check`                                  | Every `.py` file, same scope                                                                                                                              |
| `node --test`                                 | 72 tests over the pure modules                                                                                                                            |
| `pytest`                                      | 71 tests over the mirrored Python modules                                                                                                                 |
| `scripts/check-repo.mjs`                      | Structure: 67 lessons, badges consistent across three tables, no hardcoded model ids, no unresolvable imports, no committed secrets, `.env.example` empty |

### Lessons that were fully executed, with no credentials

These run end to end without an API key, and were run:

| Lesson                                                   | What ran                                                                                                   |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [02](../lessons/02-getting-an-api-key/)                  | Credential doctor, both languages                                                                          |
| [13 `legacy`](../lessons/13-model-based-grading/)        | The f-string interpolation bug, both languages                                                             |
| [14](../lessons/14-code-based-grading/)                  | Every code grader, both languages                                                                          |
| [22](../lessons/22-tool-functions/)                      | Every tool function and failure path, both languages                                                       |
| [33](../lessons/33-text-chunking-strategies/)            | Chunking comparison, both languages                                                                        |
| [37](../lessons/37-bm25-lexical-search/)                 | BM25 ranking and IDF weights, both languages                                                               |
| [44 `--offline`](../lessons/44-rules-of-prompt-caching/) | Static cache-invalidator audit, both languages                                                             |
| [47](../lessons/47-introducing-mcp/)                     | In-process MCP discovery, both languages                                                                   |
| [48](../lessons/48-mcp-clients/)                         | **All three transports** — in-process, stdio subprocess, Streamable HTTP over a real port — both languages |
| [49](../lessons/49-project-setup/)                       | SDK generation doctor, both languages                                                                      |
| [50](../lessons/50-defining-tools-with-mcp/)             | Tool calls and every error path, both languages; `legacy.py` shows the real `ModuleNotFoundError`          |
| [51](../lessons/51-the-server-inspector/)                | Full server walk, both languages                                                                           |
| [52 `--no-claude`](../lessons/52-implementing-a-client/) | High-level `Client` and low-level `ClientSession` over stdio, both languages                               |
| [53](../lessons/53-defining-resources/)                  | Resources, templates, and the not-found path, both languages                                               |
| [54 `--no-claude`](../lessons/54-accessing-resources/)   | Resource discovery including the **binary blob branch**, both languages                                    |
| [55](../lessons/55-defining-prompts/)                    | Prompt rendering and the missing-argument error, both languages; `legacy.py` shows the removed import      |
| [56 `--no-claude`](../lessons/56-prompts-in-the-client/) | Prompt menu and message conversion, both languages                                                         |
| [60](../lessons/60-enhancements-with-mcp-servers/)       | Command and `.mcp.json` generation, both languages                                                         |
| [67 `--decide-only`](../lessons/67-workflows-vs-agents/) | The tier decision over eight tasks, both languages                                                         |

That is **19 lessons executed end to end**, plus the SDK surfaces below.

### SDK facts verified by introspection, not by reading docs

| Claim                                                                      | How it was checked                             |
| -------------------------------------------------------------------------- | ---------------------------------------------- |
| Python SDK v1 removed `temperature` from `messages.create`                 | `inspect.signature` — the parameter is absent  |
| `output_format` absent from `create`, present on `parse`                   | same                                           |
| `client.files.upload/delete/download/retrieve_metadata` exist outside beta | attribute check, both SDKs                     |
| `client.beta.messages.tool_runner` / `.toolRunner` exist                   | attribute check, both SDKs                     |
| `betaZodTool` is exported from `@anthropic-ai/sdk/helpers/beta/zod`        | import check                                   |
| `mcp.server.fastmcp` raises `ModuleNotFoundError` in v2                    | import attempt against `mcp` 2.2.0             |
| `MCPServer` is at `mcp.server.mcpserver`                                   | import check                                   |
| MCP v2 uses `resource_templates`, not `resourceTemplates`                  | attribute error, then confirmed                |
| `web_search_20260318` is a current version                                 | fetched from the live tool reference           |
| `text_editor_20250728` commands are view/str_replace/create/insert         | fetched from the live docs; `undo_edit` absent |

---

## Running the live pass

Once `.env` has an `ANTHROPIC_API_KEY`:

```bash
# The cheapest meaningful smoke test - lesson 1 spends no output tokens at all
npm run lesson -- 01
uv run lesson 01

# Then work through a module
for n in 03 04 05 07 08; do npm run lesson -- $n; done
```

Lessons 34, 36 and 38 additionally need `VOYAGE_API_KEY`.

### Cost, roughly

At the default models (`claude-sonnet-5` / `claude-haiku-4-5`), running **every**
lesson once costs on the order of a few US dollars. The distribution is uneven:

| Lesson                                                                           | Why it costs more                                                                               |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [39](../lessons/39-extended-thinking/)                                           | `max` effort on a hard problem generates a lot of thinking tokens. `--efforts low,high` cuts it |
| [31](../lessons/31-the-web-search-tool/)                                         | Web search is billed per search ($10/1,000) on top of tokens, and results are large             |
| [46](../lessons/46-code-execution-and-files-api/)                                | Long sandbox turns                                                                              |
| [45](../lessons/45-prompt-caching-in-action/)                                    | Four agent loops over a deliberately large system prompt                                        |
| [15](../lessons/15-prompt-engineering/), [19](../lessons/19-providing-examples/) | Several prompt variants × several cases                                                         |

Everything else is cents.

### What a live pass should check, beyond "it ran"

The `legacy.*` files are the interesting ones, because they are **expected to fail** and
each one detects which case it is in:

| Lesson                                                     | Expected on `claude-sonnet-5`                                            | Expected on an older model |
| ---------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------- |
| [03 `legacy`](../lessons/03-making-a-request/)             | prints the block types; positional access may or may not work            | same, more likely to work  |
| [06 `legacy`](../lessons/06-temperature/)                  | Python: `TypeError` locally. TS: **400**                                 | accepted                   |
| [08 `legacy`](../lessons/08-structured-data/)              | **400** on the prefill                                                   | accepted                   |
| [39 `legacy`](../lessons/39-extended-thinking/)            | **400** on `budget_tokens`                                               | accepted                   |
| [46 `legacy`](../lessons/46-code-execution-and-files-api/) | either a 400 on the tool version, or 0 blocks found by the legacy parser | —                          |

A legacy file that _succeeds_ on a current model is a finding worth reporting, not a
pass.

---

## Updating this file

When you complete a live pass, change the badge for the lessons you ran and say which
model you ran them on. A verification claim without a model is not a claim.
