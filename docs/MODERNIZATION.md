# Modernization audit — Building with the Claude API, all 67 lessons

**Audited:** September 2026, against the Claude Platform documentation, the installed
SDKs (`anthropic` 1.4.0, `@anthropic-ai/sdk` 0.124.0, `mcp` 2.2.0,
`@modelcontextprotocol/sdk` 1.30.0) and, where a claim was checkable, a live API call.

Source precedence throughout: **current Claude Platform documentation** first, then the
Academy lesson for intent, then the public Python/Jupyter repository for the original
implementation's shape.

---

## Contents

- [How to read the status column](#how-to-read-the-status-column)
- [Corrections to the prior audit](#corrections-to-the-prior-audit)
- [Lesson-by-lesson](#lesson-by-lesson)
- [The compatibility sheet](#the-compatibility-sheet)
- [What is new since the course, by feature](#what-is-new-since-the-course-by-feature)
- [References](#references)

---

## How to read the status column

| Badge                         | Meaning                                                               |
| ----------------------------- | --------------------------------------------------------------------- |
| 🟢 **Current**                | Concept and implementation both hold.                                 |
| 🟡 **Mostly current**         | Works; misses a newer capability or uses a fragile pattern.           |
| 🟠 **Significantly outdated** | Architecture is fine; the code needs real changes.                    |
| 🔴 **Deprecated**             | The technique errors on current models. Preserved as `legacy.*` only. |

Three distinctions this audit keeps separate, because conflating them is how people end
up rewriting working code:

- **Deprecated** ≠ **removed**. `temperature` is deprecated and still works on Sonnet 4.6.
- **A newer tool version exists** ≠ **the old one stopped working**. `web_search_20250305`
  is still a supported, documented version.
- **Discouraged for new code** ≠ **broken**. Manual tool loops and low-level MCP
  `ClientSession` are both still correct.

---

## Corrections to the prior audit

This repository was built from an earlier audit of the same course. That audit was
substantially right; these are the points where checking against the SDKs and the current
docs changed the answer.

| #   | Prior audit said                                                                             | Verified finding                                                                                                                                                                                                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | MCP v2: `from mcp.server import MCPServer`                                                   | The class is at **`mcp.server.mcpserver`**. `from mcp.server import MCPServer` raises `ImportError`. Verified against `mcp` 2.2.0. The high-level client _is_ `from mcp import Client, StdioServerParameters`, as stated                                                                                                                                          |
| 2   | `temperature`/`top_p`/`top_k` — "deprecated for newer Claude models", framed around Sonnet 5 | Scoped precisely: **deprecated as of Claude Opus 4.7**; a non-default value returns 400 on Claude 4.7 and later. Sonnet 4.6 and earlier still accept them. Separately, the **Python SDK v1** removed the arguments, so it raises `TypeError` locally on any model                                                                                                 |
| 3   | Text editor: "update to `text_editor_20250728` and remove `undo_edit`"                       | Both true, but `undo_edit` was removed in **`text_editor_20250429`**, and `20250728` is otherwise identical to it plus `max_characters`. `text_editor_20250124` is not withdrawn — it is the **model-keyed** version for pre-Claude-4 models                                                                                                                      |
| 4   | Web search: newer versions exist, "including `web_search_20260318`"                          | Confirmed. Three versions are current and **capability-keyed**: `_20250305` (basic), `_20260209` (dynamic filtering), `_20260318` (adds `response_inclusion`). Dynamic filtering needs Claude 4.6+, and you must **not** also declare `code_execution` — the API provisions it                                                                                    |
| 5   | Files API described via `client.beta.files` in surrounding material                          | The Files API is **out of beta**: use `client.files.*` with **no beta header**. Verified present in both SDKs                                                                                                                                                                                                                                                     |
| 6   | Image limits: 600 images, 10 MB                                                              | Confirmed, and incomplete: there is now a **resolution tier** split. Claude 4.7+ are high-resolution (2576px long edge, 4784 visual tokens); everything else is standard (1568/1568). The same image can cost ~3× more on a high-resolution model                                                                                                                 |
| 7   | Structured outputs: "`output_format` has been superseded by `output_config.format`"          | Confirmed, with a wrinkle: `output_format` is **removed from `messages.create()` in the Python SDK v1** (`TypeError`) but **survives on `messages.parse()`**, where it takes a Pydantic model                                                                                                                                                                     |
| 8   | MCP v2 changes: FastMCP rename, WebSocket removal, high-level `Client`                       | All confirmed. Missing from the audit and load-bearing in practice: v2 moved every Pydantic field to **snake_case** (`is_error`, `input_schema`, `resource_templates`), swapped `httpx` for **`httpx2`**, moved `mcp.types` to the **`mcp-types`** package, renamed `McpError` → **`MCPError`**, and moved transport keywords from the constructor to **`run()`** |
| 9   | Claude Code: "native installation is now the recommended route"                              | Confirmed. Worth adding: the npm package installs **the same native binary** and `claude` does not invoke Node at runtime, so "Claude Code needs Node" is wrong in both directions. Native installs **auto-update**; Homebrew/WinGet/apt/dnf/apk do not                                                                                                           |
| 10  | Prefill "not supported on Claude 4.6+/Sonnet 5"                                              | Confirmed and broader: rejected on Fable 5/5.1, Opus 5, Opus 4.6/4.7/4.8, Sonnet 5 and Sonnet 4.6. Note what is _not_ deprecated alongside it: complete prior assistant turns, and `stop_sequences` itself                                                                                                                                                        |

### Found by running the code, not by reading docs

Three further facts surfaced only during the live pass, and each had made this
repository's own first draft wrong:

| Finding                                                                                                                                                                                     | Evidence                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`output_config.effort` is not universal.** `claude-haiku-4-5` returns `400 This model does not support the effort parameter.` It is accepted on Sonnet 4.6, Sonnet 5, Opus 4.6+ and Fable | Verified live against all four. Bites hardest when **routing** (lesson 64), where the point is mixing models — `supportsEffort()` / `supports_effort()` encode it, with tests |
| **`count_tokens` rejects a `file` source.** `400 File sources are not supported in the token counting endpoint.` — while `messages.create` accepts the identical block                      | Verified live. Lesson 40 now measures a `file_id` image from `usage.input_tokens` instead, and teaches the limit                                                              |
| **Adaptive thinking genuinely decides.** An easy question returns _no_ `thinking` blocks at all, so a lesson demonstrating thinking needs a genuinely hard prompt                           | Lesson 39's original problem produced 0 blocks on Sonnet 5; the replacement produces 1 readable block at both efforts                                                         |

And a methodological one, which cost three lessons a claim each: **a single-sample A/B
against a non-deterministic model does not support a performance claim.** Lessons 29, 31
and 39 all asserted one. In each case the live run either contradicted it or measured a
confound (different payloads, different search counts). All three now report the
normalising figure and say plainly what the measurement can and cannot show.

One thing the prior audit got exactly right and is worth repeating: **the course's
concepts are sound**. Everything below is about executable syntax, not architecture.

---

## Lesson-by-lesson

### Module 1 — Accessing Claude with the API

| #   | Lesson                   | Status | Finding                                                                                                                                                                           | Reference                                                                                      |
| --- | ------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Accessing the API        | 🟡     | Client→server→Claude architecture correct. `claude-sonnet-4-5` is a generation behind. Credential resolution also covers `ANTHROPIC_AUTH_TOKEN` and `ant auth login` profiles now | [Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)    |
| 2   | Getting an API key       | 🟢     | Console flow unchanged. `ant auth login` is an addition, not a replacement                                                                                                        | [Client SDKs](https://platform.claude.com/docs/en/api/client-sdks)                             |
| 3   | Making a request         | 🟡     | The call shape is unchanged. `message.content[0].text` is unsafe: adaptive thinking often puts a `thinking` block first                                                           | [Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)    |
| 4   | Multi-turn conversations | 🟢     | Still stateless, still resend history. Upgrade: append `response.content`, not the extracted text                                                                                 | [Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)    |
| 5   | System prompts           | 🟢     | `system=` correct. Block form and mid-conversation system messages are additions                                                                                                  | [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)         |
| 6   | Temperature              | 🔴     | Deprecated as of Opus 4.7; 400 on 4.7+. Python SDK v1 raises `TypeError` before sending. Replacement is **prompting** — `effort` is not a substitute                              | [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)      |
| 7   | Response streaming       | 🟢     | `client.messages.stream()` is still exactly the documented pattern. Wire event names are snake_case, not the lesson's PascalCase labels                                           | [Streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)                   |
| 8   | Structured data          | 🔴     | Prefill + `stop_sequences` → **400**. Replace with `output_config.format`                                                                                                         | [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) |

### Module 2 — Prompt evaluation

| #   | Lesson                   | Status | Finding                                                                                                                                                                    | Reference                                                                                      |
| --- | ------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 9   | Prompt evaluation        | 🟢     | Eval-driven development still explicitly recommended                                                                                                                       | [Develop tests](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)           |
| 10  | A typical eval workflow  | 🟢     | Loop unchanged. Current guidance adds measurable criteria and held-out cases                                                                                               | [Develop tests](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)           |
| 11  | Generating test datasets | 🟠     | Concept fine. The shared `chat()` helper carries `temperature`, and the generator uses prefill. Fix the **helper**, not the failing call                                   | [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) |
| 12  | Running the eval         | 🟡     | `run_prompt`/`run_test_case`/`run_eval` is a good decomposition. Inherits lesson 11's problems                                                                             | [Develop tests](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)           |
| 13  | Model based grading      | 🟠     | LLM-as-judge still recommended. Two problems: prefill, and a real bug — `eval_prompt` is a plain triple-quoted string containing `{task}`/`{solution}`, never interpolated | [Develop tests](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)           |
| 14  | Code based grading       | 🟡     | Graders all still good. The suggested prefilled ` ```code ` turn is obsolete                                                                                               | [Develop tests](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)           |

### Module 3 — Prompt engineering

| #   | Lesson                  | Status | Finding                                                                                                             | Reference                                                                                                           |
| --- | ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 15  | Prompt engineering      | 🟡     | The loop is current. `PromptEvaluator` is **course scaffolding, not an SDK feature** — the lesson does not say so   | [Develop tests](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)                                |
| 16  | Being clear and direct  | 🟢     | Matches current guidance almost word for word                                                                       | [Prompt engineering](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview)             |
| 17  | Being specific          | 🟢     | Still recommended. Format specificity is now partly enforceable with structured outputs                             | [Prompt engineering](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview)             |
| 18  | Structure with XML tags | 🟢     | **Not deprecated.** Still explicitly recommended for separating instructions, context and examples                  | [Use XML tags](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/use-xml-tags)               |
| 19  | Providing examples      | 🟢     | Still recommended: 3–5 diverse examples in `<example>` tags. Format-only examples are now better served by a schema | [Multishot prompting](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/multishot-prompting) |

### Module 4 — Tool use

| #   | Lesson                      | Status | Finding                                                                                                                                                                         | Reference                                                                                                                |
| --- | --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 20  | Introducing tool use        | 🟡     | Loop correct. The **client vs server tool** distinction is new and is where beginners fail (you never return a `tool_result` for a server tool)                                 | [Tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)                                       |
| 21  | Project overview            | 🟢     | The reminder-agent project is still a good vehicle                                                                                                                              | [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)                               |
| 22  | Tool functions              | 🟢     | Ordinary functions with validation. `strict` does not remove the need for it                                                                                                    | [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)                               |
| 23  | Tool schemas                | 🟡     | `name`/`description`/`input_schema` correct. **`strict: true`** is the addition — on the tool definition, _not_ on `tool_choice`, and it requires `additionalProperties: false` | [Strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use)                         |
| 24  | Handling message blocks     | 🟠     | Iterating `content` is right; treating it as text+tool_use is not. Dispatch on `block.type`                                                                                     | [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)                             |
| 25  | Sending tool results        | 🟠     | Protocol correct. `response.content[1].input` is unsafe. Also: preserve the whole assistant turn, batch all results into one user message, return `is_error` results            | [Implement tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use)                   |
| 26  | Multi-turn with tools       | 🟡     | Drop `temperature`; preserve `thinking` and `tool_use` blocks in history                                                                                                        | [Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)                              |
| 27  | Implementing multiple turns | 🟢     | Manual loop still valid and worth learning. The SDK **tool runner** is the new default. Add a turn limit and handle `pause_turn`                                                | [Tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)                                       |
| 28  | Using multiple tools        | 🟡     | Fine for small toolsets. **Parallel tool calls** are the practical gap; tool search and programmatic tool calling are the scale answers                                         | [Tool search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)                            |
| 29  | Fine grained tool calling   | 🟠     | Capability current, name and mechanism changed: `eager_input_streaming: true` **on the tool**, no beta header                                                                   | [Fine-grained tool streaming](https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming) |
| 30  | The text edit tool          | 🟠     | `text_editor_20250728` / `str_replace_based_edit_tool`. `undo_edit` removed in `20250429`. `max_characters` is new                                                              | [Text editor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool)                       |
| 31  | The web search tool         | 🟡     | `web_search_20250305` still works. `_20260209` adds dynamic filtering, `_20260318` adds `response_inclusion`. Errors arrive as **HTTP 200** with an error object                | [Web search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)                         |

### Module 5 — Retrieval Augmented Generation

| #   | Lesson                    | Status | Finding                                                                                                                                                                                                                | Reference                                                                      |
| --- | ------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 32  | Introducing RAG           | 🟢     | Still relevant; the _motivation_ changed. 1M context means RAG is about corpus size, cost, latency and precision — not window size                                                                                     | [Contextual retrieval](https://www.anthropic.com/news/contextual-retrieval)    |
| 33  | Text chunking strategies  | 🟢     | Semantic boundaries still win. Contextual retrieval, `voyage-context-4` and reranking sit above this                                                                                                                   | [Contextual retrieval](https://www.anthropic.com/news/contextual-retrieval)    |
| 34  | Text embeddings           | 🟠     | Anthropic still ships no embedding model. `voyage-3-large` → Voyage 4. **`input_type`: `document` for chunks, `query` for searches** — the course helper defaults everything to one value and silently degrades recall | [Embeddings](https://platform.claude.com/docs/en/build-with-claude/embeddings) |
| 35  | The full RAG flow         | 🟢     | Canonical architecture unchanged                                                                                                                                                                                       | [Embeddings](https://platform.claude.com/docs/en/build-with-claude/embeddings) |
| 36  | Implementing the RAG flow | 🟡     | Fix the input types; **batch** the embedding calls. Add contextual prefixes, citations, and a score floor                                                                                                              | [Contextual retrieval](https://www.anthropic.com/news/contextual-retrieval)    |
| 37  | BM25 lexical search       | 🟢     | Not a pre-LLM leftover. Hybrid retrieval is still the recommended baseline                                                                                                                                             | [Contextual retrieval](https://www.anthropic.com/news/contextual-retrieval)    |
| 38  | Multi-index RAG pipeline  | 🟢     | RRF still valid — it fuses **ranks**, which is why it needs no calibration. Add reranking (`rerank-2.5`) after fusion                                                                                                  | [Embeddings](https://platform.claude.com/docs/en/build-with-claude/embeddings) |

### Module 6 — Features of Claude

| #   | Lesson                     | Status | Finding                                                                                                                                                                                                                  | Reference                                                                                                                  |
| --- | -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 39  | Extended thinking          | 🔴     | `budget_tokens` **removed** on Sonnet 5 / Opus 5 / 4.7 / 4.8 / Fable (400); deprecated on 4.6; still required on Haiku 4.5. Use adaptive thinking + `output_config.effort`. `display` now defaults to `"omitted"`        | [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)                               |
| 40  | Image support              | 🟠     | Syntax correct; every number changed. 100 images for 200k-context models, **600** otherwise; 10 MB per image; a stricter per-image dimension limit above 20 images; a new **resolution tier** split                      | [Vision](https://platform.claude.com/docs/en/build-with-claude/vision)                                                     |
| 41  | PDF support                | 🟡     | Still valid. `file_id` is the addition; up to 600 pages on 1M-context models                                                                                                                                             | [PDF support](https://platform.claude.com/docs/en/build-with-claude/pdf-support)                                           |
| 42  | Citations                  | 🟢     | Unchanged mechanism. New restriction: **cannot be combined with `output_config.format`** (400). Branch on `citation.type`                                                                                                | [Citations](https://platform.claude.com/docs/en/build-with-claude/citations)                                               |
| 43  | Prompt caching             | 🟡     | Economics and TTLs unchanged. **Top-level `cache_control`** is the addition                                                                                                                                              | [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)                                     |
| 44  | Rules of prompt caching    | 🟠     | "You must place breakpoints manually" is **no longer true**. Explicit breakpoints remain, as the precision tool                                                                                                          | [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)                                     |
| 45  | Prompt caching in action   | 🟡     | The code works. For an ordinary agent loop, start with top-level caching                                                                                                                                                 | [Tool use with prompt caching](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-use-with-prompt-caching) |
| 46  | Code execution & Files API | 🟠     | `code_execution_20250522` is the legacy Python-only version; current latest is `code_execution_20260521`. **The result block types changed too** — a parser looking for `code_execution_output` silently matches nothing | [Code execution](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool)                        |

### Module 7 — Model Context Protocol

| #   | Lesson                  | Status | Finding                                                                                                                                                              | Reference                                                                           |
| --- | ----------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 47  | Introducing MCP         | 🟢     | Concept more important than ever. The **MCP connector** means a hand-written client is not always needed — though it cannot reach a local stdio server               | [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) |
| 48  | MCP clients             | 🟠     | Transports are **stdio + Streamable HTTP**. WebSockets were never in the spec and v2 removed the extra. Streamable HTTP superseded HTTP+SSE (but can itself use SSE) | [MCP migration](https://py.sdk.modelcontextprotocol.io/migration/)                  |
| 49  | Project setup           | 🟡     | A fresh `mcp` install is **v2**; the lessons were written for v1. Pin `mcp<2` to reproduce, or migrate                                                               | [MCP migration](https://py.sdk.modelcontextprotocol.io/migration/)                  |
| 50  | Defining tools with MCP | 🔴     | `mcp.server.fastmcp` **removed**, not aliased. `FastMCP` → `MCPServer`, at `mcp.server.mcpserver`. Decorators unchanged                                              | [MCP migration](https://py.sdk.modelcontextprotocol.io/migration/)                  |
| 51  | The server inspector    | 🟡     | `mcp dev` still current; the server must import under v2 first                                                                                                       | [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)                |
| 52  | Implementing a client   | 🟠     | v2's high-level `Client` owns transport, negotiation and lifecycle. `ClientSession` remains as the low-level escape hatch                                            | [MCP migration](https://py.sdk.modelcontextprotocol.io/migration/)                  |
| 53  | Defining resources      | 🟡     | `@mcp.resource()` unchanged. Templates need a **separate** `list_resource_templates()` call                                                                          | [MCP specification](https://modelcontextprotocol.io/specification/latest)           |
| 54  | Accessing resources     | 🟠     | Operations current. **Never assume one content block** — `contents` is a list, and each entry is `{uri, text}` **or** `{uri, blob}`                                  | [MCP specification](https://modelcontextprotocol.io/specification/latest)           |
| 55  | Defining prompts        | 🔴     | `mcp.server.fastmcp.prompts` gone with the rest of the package. The simplest v2 prompt needs no helper import at all                                                 | [MCP migration](https://py.sdk.modelcontextprotocol.io/migration/)                  |
| 56  | Prompts in the client   | 🟠     | Capability current, plumbing outdated. MCP prompt messages are **not** Anthropic messages — convert explicitly                                                       | [MCP specification](https://modelcontextprotocol.io/specification/latest)           |

### Module 8 — Anthropic apps

| #   | Lesson                        | Status | Finding                                                                                                                                                       | Reference                                                    |
| --- | ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 57  | Anthropic apps                | 🟢     | Still useful. Missing: Claude Agent SDK, Managed Agents, Agent Skills — and the distinction between them                                                      | [Claude Code](https://code.claude.com/docs/en/overview)      |
| 58  | Claude Code setup             | 🟠     | **Native installer is recommended.** npm installs the same native binary and `claude` does not invoke Node at runtime. Native Windows supported; WSL optional | [Claude Code setup](https://code.claude.com/docs/en/setup)   |
| 59  | Claude Code in action         | 🟡     | `/init` and `CLAUDE.md` current. Prefer `/memory`; know the memory hierarchy                                                                                  | [Claude Code memory](https://code.claude.com/docs/en/memory) |
| 60  | Enhancements with MCP servers | 🟡     | Very relevant. Use the explicit form: `claude mcp add --transport stdio name -- command args`                                                                 | [Claude Code MCP](https://code.claude.com/docs/en/mcp)       |

### Module 9 — Agents and workflows

| #   | Lesson                    | Status | Finding                                                                                                                                                                                        | Reference                                                                                                            |
| --- | ------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 61  | Agents and workflows      | 🟢     | Excellent. Missing 2026 option: **Managed Agents** — and the harness/hosting distinction between it, the tool runner and the Agent SDK                                                         | [Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview)                                        |
| 62  | Parallelization workflows | 🟢     | Aged well. Three layers now: parallel requests, parallel tool calls, parallel agents                                                                                                           | [Building effective agents](https://www.anthropic.com/research/building-effective-agents)                            |
| 63  | Chaining workflows        | 🟢     | Still right. **Programmatic tool calling** can collapse chains of _tool_ calls — it does not replace workflow chaining                                                                         | [Programmatic tool calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling) |
| 64  | Routing workflows         | 🟢     | More useful than it was: branches can differ by model, effort, tools, skills, MCP servers, or be whole agents                                                                                  | [Building effective agents](https://www.anthropic.com/research/building-effective-agents)                            |
| 65  | Agents and tools          | 🟡     | "Tools should be abstract" is a heuristic for coding agents, not a rule. `strict`, tool search, PTC and permission policies all shifted the trade-off toward narrow tools with least authority | [Strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use)                     |
| 66  | Environment inspection    | 🟢     | Very current. `computer_toolset_20260801` and `browser_toolset_20260801` are **client toolsets** — dispatch on `(toolset_name, name)`                                                          | [Computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)                      |
| 67  | Workflows vs agents       | 🟢     | The best advice in the course. Agents got easier to build, which makes the discipline matter more, not less                                                                                    | [Building effective agents](https://www.anthropic.com/research/building-effective-agents)                            |

**Totals:** 🟢 27 · 🟡 20 · 🟠 15 · 🔴 5

---

## The compatibility sheet

| The Academy teaches                             | Use in 2026                                                            | Lesson                                                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `claude-sonnet-4-5`                             | A current model — this repo defaults to `claude-sonnet-5`              | [1](../lessons/01-accessing-the-api/), [3](../lessons/03-making-a-request/)                            |
| `temperature`, `top_p`, `top_k`                 | **Omit.** 400 on Claude 4.7+; Python SDK v1 raises `TypeError`         | [6](../lessons/06-temperature/)                                                                        |
| Prefill + `stop_sequences` for JSON             | `output_config.format`                                                 | [8](../lessons/08-structured-data/)                                                                    |
| Assistant prefilling generally                  | 400 on current models. Complete prior turns are fine                   | [8](../lessons/08-structured-data/)                                                                    |
| `response.content[0]` / `content[1].input`      | Dispatch on `block.type`                                               | [24](../lessons/24-handling-message-blocks/), [25](../lessons/25-sending-tool-results/)                |
| Appending only the assistant's text             | Append `response.content` — every block                                | [4](../lessons/04-multi-turn-conversations/), [26](../lessons/26-multi-turn-conversations-with-tools/) |
| Tools without `strict`                          | `strict: true` + `additionalProperties: false`, on the **tool**        | [23](../lessons/23-tool-schemas/)                                                                      |
| Manual tool loop only                           | Still valid; also learn the SDK **tool runner**                        | [27](../lessons/27-implementing-multiple-turns/)                                                       |
| One tool call per turn                          | **Parallel tool calls**; all results in one user message               | [28](../lessons/28-using-multiple-tools/)                                                              |
| `fine_grained=True`                             | `eager_input_streaming: true` on the tool                              | [29](../lessons/29-fine-grained-tool-calling/)                                                         |
| `text_editor_20250124` / `str_replace_editor`   | `text_editor_20250728` / `str_replace_based_edit_tool`; no `undo_edit` | [30](../lessons/30-the-text-edit-tool/)                                                                |
| `web_search_20250305`                           | Still works; `_20260318` is current                                    | [31](../lessons/31-the-web-search-tool/)                                                               |
| `voyage-3-large`                                | Voyage 4 generation                                                    | [34](../lessons/34-text-embeddings/)                                                                   |
| One `input_type` for everything                 | `document` for chunks, `query` for searches                            | [34](../lessons/34-text-embeddings/)                                                                   |
| Embedding chunks one at a time                  | Batch them                                                             | [36](../lessons/36-implementing-the-rag-flow/)                                                         |
| `thinking={"type":"enabled","budget_tokens":N}` | Adaptive thinking + `output_config.effort`                             | [39](../lessons/39-extended-thinking/)                                                                 |
| 100 images / 5 MB                               | 100 (200k models) or 600; 10 MB; resolution tiers                      | [40](../lessons/40-image-support/)                                                                     |
| Base64 only, for images and PDFs                | Also `file_id` via the Files API (`client.files.*`, no beta)           | [40](../lessons/40-image-support/), [41](../lessons/41-pdf-support/)                                   |
| Manually moving cache breakpoints               | Top-level `cache_control` moves it for you                             | [44](../lessons/44-rules-of-prompt-caching/)                                                           |
| `code_execution_20250522`                       | `code_execution_20260521`; result block types changed                  | [46](../lessons/46-code-execution-and-files-api/)                                                      |
| `from mcp.server.fastmcp import FastMCP`        | `from mcp.server.mcpserver import MCPServer`                           | [50](../lessons/50-defining-tools-with-mcp/)                                                           |
| `mcp.server.fastmcp.prompts` helpers            | Return a string; no helper import needed                               | [55](../lessons/55-defining-prompts/)                                                                  |
| Manual `ClientSession` first                    | High-level `Client`; `ClientSession` remains the escape hatch          | [52](../lessons/52-implementing-a-client/)                                                             |
| stdio / HTTP / WebSockets                       | stdio + Streamable HTTP                                                | [48](../lessons/48-mcp-clients/)                                                                       |
| MCP camelCase fields (Python)                   | snake_case: `is_error`, `input_schema`, `resource_templates`           | [49](../lessons/49-project-setup/)                                                                     |
| `npm install -g @anthropic-ai/claude-code`      | Native installer; npm is one channel of several                        | [58](../lessons/58-claude-code-setup/)                                                                 |
| `claude mcp add documents uv run main.py`       | `claude mcp add --transport stdio documents -- uv run main.py`         | [60](../lessons/60-enhancements-with-mcp-servers/)                                                     |
| "Tools should be abstract"                      | Composable, clear, **least authority**                                 | [65](../lessons/65-agents-and-tools/)                                                                  |
| Manual agent loops are the only option          | Manual loop, tool runner, Agent SDK, or Managed Agents                 | [61](../lessons/61-agents-and-workflows/)                                                              |

---

## What is new since the course, by feature

Things with no counterpart in the course at all. Each is introduced in the lesson where
it first becomes relevant.

| Feature                                         | What it replaces or adds                 | Lesson                                                                                                                   |
| ----------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Structured outputs** (`output_config.format`) | prompt tricks for JSON                   | [8](../lessons/08-structured-data/)                                                                                      |
| **Strict tool use** (`strict: true`)            | hoping tool arguments validate           | [23](../lessons/23-tool-schemas/)                                                                                        |
| **Tool runner**                                 | hand-writing the agent loop              | [27](../lessons/27-implementing-multiple-turns/)                                                                         |
| **Tool search** (`defer_loading`)               | a prompt bloated by 200 tool definitions | [28](../lessons/28-using-multiple-tools/)                                                                                |
| **Programmatic tool calling**                   | round-tripping every hop of a tool chain | [28](../lessons/28-using-multiple-tools/), [63](../lessons/63-chaining-workflows/)                                       |
| **Adaptive thinking + effort**                  | `budget_tokens`                          | [39](../lessons/39-extended-thinking/)                                                                                   |
| **Files API** (out of beta)                     | resending bytes every turn               | [40](../lessons/40-image-support/), [41](../lessons/41-pdf-support/), [46](../lessons/46-code-execution-and-files-api/)  |
| **Automatic cache breakpoints**                 | moving `cache_control` by hand           | [44](../lessons/44-rules-of-prompt-caching/)                                                                             |
| **Contextual retrieval / `voyage-context-4`**   | bare chunks                              | [33](../lessons/33-text-chunking-strategies/), [36](../lessons/36-implementing-the-rag-flow/)                            |
| **Reranking** (`rerank-2.5`)                    | trusting the top-k of one retriever      | [38](../lessons/38-multi-index-rag-pipeline/)                                                                            |
| **MCP connector** (`mcp_toolset`)               | writing a client for a remote server     | [47](../lessons/47-introducing-mcp/)                                                                                     |
| **Computer / browser toolsets**                 | screenshot loops built by hand           | [66](../lessons/66-environment-inspection/)                                                                              |
| **Managed Agents**                              | hosting the agent loop yourself          | [57](../lessons/57-anthropic-apps/), [61](../lessons/61-agents-and-workflows/), [67](../lessons/67-workflows-vs-agents/) |
| **Claude Agent SDK**                            | building a coding agent from scratch     | [57](../lessons/57-anthropic-apps/)                                                                                      |
| **Compaction / context editing**                | manual history trimming                  | [4](../lessons/04-multi-turn-conversations/)                                                                             |

---

## References

Every lesson README links the specific pages it depends on. The index:

- [Model overview](https://platform.claude.com/docs/en/about-claude/models/overview) ·
  [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations) ·
  [Migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide)
- [Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages) ·
  [Streaming](https://platform.claude.com/docs/en/build-with-claude/streaming) ·
  [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking) ·
  [Effort](https://platform.claude.com/docs/en/build-with-claude/effort) ·
  [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) ·
  [Tool reference](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference) ·
  [Strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use) ·
  [Fine-grained tool streaming](https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming)
- [Text editor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool) ·
  [Web search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool) ·
  [Code execution tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool) ·
  [Tool search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool) ·
  [Programmatic tool calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling) ·
  [Computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool) ·
  [Browser use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool)
- [Vision](https://platform.claude.com/docs/en/build-with-claude/vision) ·
  [PDF support](https://platform.claude.com/docs/en/build-with-claude/pdf-support) ·
  [Citations](https://platform.claude.com/docs/en/build-with-claude/citations) ·
  [Files API](https://platform.claude.com/docs/en/build-with-claude/files)
- [Embeddings](https://platform.claude.com/docs/en/build-with-claude/embeddings) ·
  [Contextual retrieval](https://www.anthropic.com/news/contextual-retrieval)
- [Develop tests](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests) ·
  [Prompt engineering](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview)
- [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector) ·
  [MCP specification](https://modelcontextprotocol.io/specification/latest) ·
  [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) ·
  [MCP Python SDK v1→v2 migration](https://py.sdk.modelcontextprotocol.io/migration/)
- [Claude Code setup](https://code.claude.com/docs/en/setup) ·
  [Claude Code memory](https://code.claude.com/docs/en/memory) ·
  [Claude Code MCP](https://code.claude.com/docs/en/mcp) ·
  [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk)
- [Building effective agents](https://www.anthropic.com/research/building-effective-agents) ·
  [Managed Agents](https://platform.claude.com/docs/en/managed-agents/overview)
