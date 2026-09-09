# Building with the Claude API — modern TypeScript + Python companion

A runnable companion to Anthropic's [**Building with the Claude API**](https://academy.claude.com/courses/building-with-the-claude-api)
Academy course, updated for the **2026 Claude platform**.

Every coding lesson in the course has, in this repository:

- a **Python** implementation,
- an equivalent **TypeScript** implementation,
- a `README.md` that says what the lesson teaches, **what has changed since it was
  recorded**, and what the current API looks like,
- and, where the original technique no longer works, a clearly labelled **legacy**
  file next to the modern replacement so you can see both.

The course is excellent on architecture — prompting, evaluation, tool use, RAG, MCP,
agents. Its _code_ spans several older API and SDK generations. The rule this
repository follows:

> **Claude Academy is the curriculum. The current Claude Platform documentation is the
> API specification.**

---

## Status legend

Each lesson README carries a 2026 status:

| Badge                           | Meaning                                                               |
| ------------------------------- | --------------------------------------------------------------------- |
| 🟢 **Current**                  | The concept and the implementation both still hold.                   |
| 🟡 **Mostly current**           | Works, but misses a newer capability or uses a fragile pattern.       |
| 🟠 **Significantly outdated**   | Architecture is fine; the code needs real changes.                    |
| 🔴 **Deprecated / unsupported** | The technique errors on current models. Preserved as `legacy.*` only. |

Verification badges used in this repo:

| Badge                 | Meaning                                                                                |
| --------------------- | -------------------------------------------------------------------------------------- |
| `STATICALLY VERIFIED` | Type-checks, lints, and its pure logic is unit-tested — but no live API call was made. |
| `LIVE API VERIFIED`   | Actually executed against the Claude API, in both languages, and its output inspected. |

**63 of 67 lessons are `LIVE API VERIFIED`** against `claude-sonnet-5` and
`claude-haiku-4-5` (9 September 2026). The four that are not — 34, 35, 36, 38 — need a
`VOYAGE_API_KEY`; their missing-key path is verified, their retrieval is not.

Running the code found nine things static checking could not, including three facts about
the API this repository had wrong. All of them, and what each lesson actually
demonstrated live, are in [`docs/VERIFICATION.md`](docs/VERIFICATION.md).

---

## Quick start

### Prerequisites

| Tool                             | Version     | Why                                                                                   |
| -------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| [Node.js](https://nodejs.org)    | **≥ 22.18** | Runs the `.ts` lessons directly via built-in type stripping. No build step, no `tsx`. |
| [uv](https://docs.astral.sh/uv/) | ≥ 0.5       | Python dependency management and the `lesson` runner.                                 |
| Python                           | ≥ 3.11      | Installed for you by `uv`.                                                            |

### Install

```bash
git clone https://github.com/MyElectricSheep/building-with-the-claude-api.git
cd building-with-the-claude-api

npm install          # TypeScript side
uv sync --all-extras # Python side (includes the RAG and MCP lessons)
```

### Configure credentials

```bash
cp .env.example .env
$EDITOR .env
```

`.env` is git-ignored. Only two lessons groups need a second key:

| Variable            | Needed by                       | Get it from                                 |
| ------------------- | ------------------------------- | ------------------------------------------- |
| `ANTHROPIC_API_KEY` | Almost every lesson             | <https://platform.claude.com/settings/keys> |
| `VOYAGE_API_KEY`    | Lessons 34, 36, 38 (embeddings) | <https://dashboard.voyageai.com/>           |

Never put a real key in `.env.example`, in a lesson file, or in a commit.

### Run a lesson

```bash
npm run lesson -- 03          # TypeScript: lessons/03-making-a-request/typescript/example.ts
uv run lesson 03              # Python:     lessons/03-making-a-request/python/example.py

npm run lesson -- 06 legacy   # the preserved, deprecated Academy version
uv run lesson 06 legacy

npm run lesson -- 40 -- --help  # pass arguments through to the lesson itself
uv run lesson 40 -- --help
```

You can also just run the file: `node lessons/03-making-a-request/typescript/example.ts`.
The runner exists only to load `.env` and to save you typing the path.

### Check everything without spending a cent

```bash
npm run check   # typecheck + format check + unit tests + repo structure check
uv run pytest   # Python unit tests
uv run ruff check .
```

None of these make an API call. All pure logic — chunking, BM25, RRF, cosine
similarity, grading, routing, block handling — is separated from the network so it
stays testable without credentials.

---

## Repository layout

```
lessons/NN-slug/
  README.md            what it teaches · 2026 status · what changed · how to run
  python/example.py    current, recommended Python implementation
  python/legacy.py     (only where useful) the Academy-era technique, clearly labelled
  typescript/example.ts
  typescript/legacy.ts

shared/typescript/     model config, block helpers, chunking, retrieval (+ unit tests)
shared/python/course/  the same helpers, mirrored
assets/                sample images, PDF and the small RAG corpus
scripts/               the lesson runner and repo structure check
docs/                  MODERNIZATION.md (full audit) · VERIFICATION.md · MODELS.md
```

Lessons never hardcode a model. They import `MODEL` from `shared/typescript/config.ts`
or `course.config`, so one edit re-points the whole course.

---

## What changed since the course was recorded

The full lesson-by-lesson audit with citations is in
[`docs/MODERNIZATION.md`](docs/MODERNIZATION.md). The short version:

| The Academy teaches                             | Use in 2026                                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `claude-sonnet-4-5`                             | A current model — this repo defaults to `claude-sonnet-5`                                                          |
| `temperature`, `top_p`, `top_k`                 | **Omit them.** 400 on Claude 4.7+ / Sonnet 5; the Python SDK v1 raises `TypeError` before the request is even sent |
| Assistant prefilling to force JSON              | **Structured outputs** — `output_config.format`                                                                    |
| Prefill + `stop_sequences` for JSON             | Same — prefill returns 400 on current models                                                                       |
| `response.content[0]` / `content[1].input`      | **Dispatch on `block.type`.** Adaptive thinking puts a `thinking` block first                                      |
| `thinking={"type":"enabled","budget_tokens":N}` | **Adaptive thinking** + `output_config.effort`                                                                     |
| Tools without `strict`                          | Add `strict: true` + `additionalProperties: false`                                                                 |
| Hand-written tool loop only                     | Still valid and worth learning; also learn the SDK **tool runner**                                                 |
| `fine_grained=True`                             | `eager_input_streaming: true` on the individual tool                                                               |
| `text_editor_20250124` / `str_replace_editor`   | `text_editor_20250728` / `str_replace_based_edit_tool`; `undo_edit` removed                                        |
| `web_search_20250305`                           | Still works; `web_search_20260318` is the current version                                                          |
| `code_execution_20250522`                       | `code_execution_20260521`; result block types changed too                                                          |
| `voyage-3-large`                                | Voyage 4 generation (`voyage-4`, `voyage-4-lite`, …)                                                               |
| `input_type="query"` for everything             | `document` for chunks, `query` for searches                                                                        |
| Manually moving `cache_control` breakpoints     | Top-level `cache_control` moves the breakpoint for you                                                             |
| Base64 images/PDFs only                         | Also `file_id` via the Files API                                                                                   |
| 100 images / 5 MB per request                   | 100 for 200k-context models, **600** otherwise; 10 MB per image                                                    |
| `from mcp.server.fastmcp import FastMCP`        | MCP Python SDK v2: `from mcp.server.mcpserver import MCPServer`                                                    |
| Manual `ClientSession` plumbing                 | The v2 high-level client; `ClientSession` remains as the low-level escape hatch                                    |
| stdio / HTTP / **WebSockets**                   | stdio + Streamable HTTP (WebSocket transport was removed in v2)                                                    |
| `npm install -g @anthropic-ai/claude-code`      | Native install is the recommended route                                                                            |
| "tools should be abstract"                      | Composable, least authority, clear schemas — plus tool search for large catalogs                                   |
| Manual agent loops are the only option          | Messages API loop **or** Claude Managed Agents                                                                     |

---

## Model policy

| Constant            | Default            | Used for                                                                                                                         |
| ------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE_MODEL`      | `claude-sonnet-5`  | Almost every lesson                                                                                                              |
| `CLAUDE_FAST_MODEL` | `claude-haiku-4-5` | Bulk work where the lesson teaches a mechanism, not answer quality: dataset generation, classification, routing, fan-out workers |
| `VOYAGE_MODEL`      | `voyage-4-lite`    | Embeddings (lessons 34–38)                                                                                                       |

These are deliberately **teaching-grade, low-cost** defaults, not a recommendation for
production. Anthropic's own guidance is to reach for the most capable model
(`claude-opus-5`) unless you have measured that a cheaper one is sufficient. Every
lesson respects an override:

```bash
CLAUDE_MODEL=claude-opus-5 npm run lesson -- 39
```

See [`docs/MODELS.md`](docs/MODELS.md) for the current lineup and why these defaults
were chosen.

### Keeping the bill small

Lessons use short prompts, small `max_tokens`, tiny datasets, and the cheap model
wherever the lesson does not require a stronger one. The most expensive lessons are
flagged in their own README. Nothing in this repository loops over an API call more
times than the lesson needs.

---

## Lesson index

### Module 1 — Accessing Claude with the API

| #   | Lesson                                                           | 2026 status | Note                                                                       |
| --- | ---------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| 1   | [Accessing the API](lessons/01-accessing-the-api/)               | 🟡          | Architecture correct; the example model is stale                           |
| 2   | [Getting an API key](lessons/02-getting-an-api-key/)             | 🟢          | Console workflow unchanged (+ `ant auth login` is new)                     |
| 3   | [Making a request](lessons/03-making-a-request/)                 | 🟡          | Same call shape; swap the model, stop indexing `content[0]`                |
| 4   | [Multi-turn conversations](lessons/04-multi-turn-conversations/) | 🟢          | The API is still stateless; you still resend history                       |
| 5   | [System prompts](lessons/05-system-prompts/)                     | 🟢          | `system=` still correct; blocks + mid-conversation system messages are new |
| 6   | [Temperature](lessons/06-temperature/)                           | 🔴          | `temperature`/`top_p`/`top_k` deprecated — steer with prompting            |
| 7   | [Response streaming](lessons/07-response-streaming/)             | 🟢          | `client.messages.stream()` is still exactly right                          |
| 8   | [Structured data](lessons/08-structured-data/)                   | 🔴          | Prefill + stop sequences → **structured outputs**                          |

### Module 2 — Prompt evaluation

| #   | Lesson                                                           | 2026 status | Note                                                                     |
| --- | ---------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| 9   | [Prompt evaluation](lessons/09-prompt-evaluation/)               | 🟢          | Eval-driven development is still the recommendation                      |
| 10  | [A typical eval workflow](lessons/10-a-typical-eval-workflow/)   | 🟢          | Prompt → dataset → run → grade → iterate                                 |
| 11  | [Generating test datasets](lessons/11-generating-test-datasets/) | 🟠          | Concept fine; the helper's `temperature` + prefill must go               |
| 12  | [Running the eval](lessons/12-running-the-eval/)                 | 🟡          | Design is sound; inherits the helper's problems                          |
| 13  | [Model based grading](lessons/13-model-based-grading/)           | 🟠          | Grading is current; the prefill is not. Course bug: unformatted f-string |
| 14  | [Code based grading](lessons/14-code-based-grading/)             | 🟡          | Deterministic grading is right; drop the prefill suggestion              |

### Module 3 — Prompt engineering

| #   | Lesson                                                         | 2026 status | Note                                                                         |
| --- | -------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| 15  | [Prompt engineering](lessons/15-prompt-engineering/)           | 🟡          | Loop is current; `PromptEvaluator` is course scaffolding, not an SDK feature |
| 16  | [Being clear and direct](lessons/16-being-clear-and-direct/)   | 🟢          | Matches current guidance                                                     |
| 17  | [Being specific](lessons/17-being-specific/)                   | 🟢          | Still recommended                                                            |
| 18  | [Structure with XML tags](lessons/18-structure-with-xml-tags/) | 🟢          | Explicitly still recommended                                                 |
| 19  | [Providing examples](lessons/19-providing-examples/)           | 🟢          | 3–5 diverse examples in `<example>` tags                                     |

### Module 4 — Tool use with Claude

| #   | Lesson                                                                   | 2026 status | Note                                                            |
| --- | ------------------------------------------------------------------------ | ----------- | --------------------------------------------------------------- |
| 20  | [Introducing tool use](lessons/20-introducing-tool-use/)                 | 🟡          | Loop correct; client vs **server** tools is the new distinction |
| 21  | [Project overview](lessons/21-project-overview/)                         | 🟢          | The reminder-agent project still works as a teaching vehicle    |
| 22  | [Tool functions](lessons/22-tool-functions/)                             | 🟢          | Ordinary functions, validated inputs                            |
| 23  | [Tool schemas](lessons/23-tool-schemas/)                                 | 🟡          | Add `strict: true` + `additionalProperties: false`              |
| 24  | [Handling message blocks](lessons/24-handling-message-blocks/)           | 🟠          | Responses are not "text + tool_use" any more                    |
| 25  | [Sending tool results](lessons/25-sending-tool-results/)                 | 🟠          | `content[1].input` is unsafe; find blocks by type               |
| 26  | [Multi-turn with tools](lessons/26-multi-turn-conversations-with-tools/) | 🟡          | Drop `temperature`; preserve thinking blocks in history         |
| 27  | [Implementing multiple turns](lessons/27-implementing-multiple-turns/)   | 🟢          | Manual loop still valid; **tool runner** is the new default     |
| 28  | [Using multiple tools](lessons/28-using-multiple-tools/)                 | 🟡          | Fine for small toolsets; tool search + PTC exist now            |
| 29  | [Fine grained tool calling](lessons/29-fine-grained-tool-calling/)       | 🟠          | `fine_grained=True` → `eager_input_streaming: true`             |
| 30  | [The text edit tool](lessons/30-the-text-edit-tool/)                     | 🟠          | New version + name; `undo_edit` removed                         |
| 31  | [The web search tool](lessons/31-the-web-search-tool/)                   | 🟡          | Old version still works; newer ones add dynamic filtering       |

### Module 5 — Retrieval Augmented Generation

| #   | Lesson                                                             | 2026 status | Note                                                         |
| --- | ------------------------------------------------------------------ | ----------- | ------------------------------------------------------------ |
| 32  | [Introducing RAG](lessons/32-introducing-rag/)                     | 🟢          | Still relevant — the _motivation_ changed, not the technique |
| 33  | [Text chunking strategies](lessons/33-text-chunking-strategies/)   | 🟢          | Semantic boundaries still win                                |
| 34  | [Text embeddings](lessons/34-text-embeddings/)                     | 🟠          | Voyage 4; `document` vs `query` input types                  |
| 35  | [The full RAG flow](lessons/35-the-full-rag-flow/)                 | 🟢          | Canonical architecture unchanged                             |
| 36  | [Implementing the RAG flow](lessons/36-implementing-the-rag-flow/) | 🟡          | Fix input types; batch the embedding calls                   |
| 37  | [BM25 lexical search](lessons/37-bm25-lexical-search/)             | 🟢          | Hybrid retrieval is still a strong architecture              |
| 38  | [Multi-index RAG pipeline](lessons/38-multi-index-rag-pipeline/)   | 🟢          | RRF still valid; add reranking next                          |

### Module 6 — Features of Claude

| #   | Lesson                                                                 | 2026 status | Note                                                       |
| --- | ---------------------------------------------------------------------- | ----------- | ---------------------------------------------------------- |
| 39  | [Extended thinking](lessons/39-extended-thinking/)                     | 🔴          | `budget_tokens` → adaptive thinking + `effort`             |
| 40  | [Image support](lessons/40-image-support/)                             | 🟠          | Syntax fine; limits changed; Files API is a third source   |
| 41  | [PDF support](lessons/41-pdf-support/)                                 | 🟡          | Still valid; `file_id` and higher page limits are new      |
| 42  | [Citations](lessons/42-citations/)                                     | 🟢          | Unchanged — but cannot be combined with structured outputs |
| 43  | [Prompt caching](lessons/43-prompt-caching/)                           | 🟡          | TTLs unchanged; automatic breakpoint placement is new      |
| 44  | [Rules of prompt caching](lessons/44-rules-of-prompt-caching/)         | 🟠          | "You must place breakpoints manually" is no longer true    |
| 45  | [Prompt caching in action](lessons/45-prompt-caching-in-action/)       | 🟡          | Explicit breakpoints still work; start automatic           |
| 46  | [Code execution & Files API](lessons/46-code-execution-and-files-api/) | 🟠          | Legacy tool version; result block types changed            |

### Module 7 — Model Context Protocol

| #   | Lesson                                                         | 2026 status | Note                                                              |
| --- | -------------------------------------------------------------- | ----------- | ----------------------------------------------------------------- |
| 47  | [Introducing MCP](lessons/47-introducing-mcp/)                 | 🟢          | Concept more important than ever; MCP connector is new            |
| 48  | [MCP clients](lessons/48-mcp-clients/)                         | 🟠          | Transports: stdio + Streamable HTTP. WebSockets removed           |
| 49  | [Project setup](lessons/49-project-setup/)                     | 🟡          | A fresh `mcp` install is **v2** — the lessons were written for v1 |
| 50  | [Defining tools with MCP](lessons/50-defining-tools-with-mcp/) | 🔴          | `mcp.server.fastmcp` was removed, not aliased                     |
| 51  | [The server inspector](lessons/51-the-server-inspector/)       | 🟡          | `mcp dev` still current; the server must be v2                    |
| 52  | [Implementing a client](lessons/52-implementing-a-client/)     | 🟠          | High-level client first; `ClientSession` is the escape hatch      |
| 53  | [Defining resources](lessons/53-defining-resources/)           | 🟡          | Decorators unchanged; the server class changed                    |
| 54  | [Accessing resources](lessons/54-accessing-resources/)         | 🟠          | Operations current; don't assume one content block                |
| 55  | [Defining prompts](lessons/55-defining-prompts/)               | 🔴          | v1 prompt-helper imports are gone                                 |
| 56  | [Prompts in the client](lessons/56-prompts-in-the-client/)     | 🟠          | Capability current, plumbing outdated                             |

### Module 8 — Anthropic apps

| #   | Lesson                                                                     | 2026 status | Note                                                             |
| --- | -------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------- |
| 57  | [Anthropic apps](lessons/57-anthropic-apps/)                               | 🟢          | Still useful; the ecosystem has grown a lot                      |
| 58  | [Claude Code setup](lessons/58-claude-code-setup/)                         | 🟠          | Native install preferred; npm optional; native Windows supported |
| 59  | [Claude Code in action](lessons/59-claude-code-in-action/)                 | 🟡          | `/init` + `CLAUDE.md` current; prefer `/memory`                  |
| 60  | [Enhancements with MCP servers](lessons/60-enhancements-with-mcp-servers/) | 🟡          | Very relevant; modernize the `claude mcp add` syntax             |

### Module 9 — Agents and workflows

| #   | Lesson                                                             | 2026 status | Note                                                            |
| --- | ------------------------------------------------------------------ | ----------- | --------------------------------------------------------------- |
| 61  | [Agents and workflows](lessons/61-agents-and-workflows/)           | 🟢          | Excellent; Managed Agents is the missing 2026 option            |
| 62  | [Parallelization workflows](lessons/62-parallelization-workflows/) | 🟢          | Three kinds of parallelism now, not one                         |
| 63  | [Chaining workflows](lessons/63-chaining-workflows/)               | 🟢          | Still right; programmatic tool calling can collapse some chains |
| 64  | [Routing workflows](lessons/64-routing-workflows/)                 | 🟢          | More useful than ever                                           |
| 65  | [Agents and tools](lessons/65-agents-and-tools/)                   | 🟡          | "Tools should be abstract" is a heuristic, not a rule           |
| 66  | [Environment inspection](lessons/66-environment-inspection/)       | 🟢          | Computer use + browser use make this concrete                   |
| 67  | [Workflows vs agents](lessons/67-workflows-vs-agents/)             | 🟢          | Still the best engineering instinct in the course               |

---

## Attribution and licence

- The **Claude Academy course** is Anthropic's. This repository does not reproduce its
  prose. Concepts are summarised in original wording, and every lesson README links
  back to the corresponding lesson.
- The public Python/Jupyter course repository
  [`jaygaha/Building-with-the-Claude-API`](https://github.com/jaygaha/Building-with-the-Claude-API)
  was used to understand the shape of the original executable material. **It carries no
  licence file**, so none of its code is copied here — every implementation in this
  repository is written from scratch against the current SDKs. See
  [`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md).
- Everything in this repository is MIT licensed — see [`LICENSE`](LICENSE).

## Reference

- [Claude Platform documentation](https://platform.claude.com/docs/en/home)
- [Model overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)
- [Migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide)
