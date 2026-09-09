# Verification status

Two badges are used in this repository, and they mean different things:

| Badge                 | Means                                                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STATICALLY VERIFIED` | Type-checks under `tsc --strict`, lints clean under `ruff`, its pure logic is covered by unit tests, and it was executed as far as it goes without credentials. **No live API call was made.** |
| `LIVE API VERIFIED`   | Actually executed end-to-end against the Claude API, in **both languages**, and its output inspected — not just its exit code.                                                                 |

Nothing in this file claims a lesson was tested when it was not.

---

## Current state

**63 of 67 lessons are `LIVE API VERIFIED`** against `claude-sonnet-5` and
`claude-haiku-4-5`, on **9 September 2026**, in both Python and TypeScript.

|                                            | Lessons                                                     | Status                |
| ------------------------------------------ | ----------------------------------------------------------- | --------------------- |
| Ran live, both languages, output inspected | 1, 2, 3–8, 9–19, 20–31, 32, 33, 37, 39–46, 47–56, 60, 61–67 | `LIVE API VERIFIED`   |
| Cannot run without `VOYAGE_API_KEY`        | **34, 35, 36, 38**                                          | `STATICALLY VERIFIED` |
| No code by design (documentation lessons)  | 57, 58, 59                                                  | n/a                   |

The four RAG lessons that need a Voyage key were confirmed to **fail cleanly** with an
actionable message rather than a stack trace — that path is verified, the retrieval is
not.

### Static checks, which need no credentials

```bash
npm run check    # tsc --noEmit + prettier --check + 74 tests + scripts/check-repo.mjs
uv run pytest    # 73 tests
uv run ruff check .
```

`scripts/check-repo.mjs` fails on a hardcoded model id outside the config modules, a
status badge that disagrees across the three index tables, a README run command naming
the wrong lesson, an unresolvable import, or anything resembling a committed secret.

---

## What the live pass changed

Running the code found **nine** problems that static checking could not. Six were in this
repository's own material; three were facts about the API that its documentation had
wrong. That ratio is the argument for doing a live pass at all.

### Facts about the API that were wrong

| Finding                                                                                                                                                                      | Broke                                                | Evidence                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **`output_config.effort` is not universal.** `claude-haiku-4-5` → `400 This model does not support the effort parameter.` Accepted on Sonnet 4.6, Sonnet 5, Opus 4.6+, Fable | Lesson **64** outright                               | Tested against all four models. Now encoded as `supportsEffort()` / `supports_effort()` with unit tests |
| **`count_tokens` rejects a `file` source.** `400 File sources are not supported in the token counting endpoint.` — while `messages.create` accepts the identical block       | Lesson **40** outright                               | Lesson 40 now measures from `usage.input_tokens` and teaches the limit                                  |
| **The Models API returns dated ids** (`claude-haiku-4-5-20251001`) where the documented id is undated (`claude-haiku-4-5`)                                                   | Lesson **1** reported a working model as unavailable | Both forms confirmed to resolve; the check now matches dated aliases                                    |

### Claims this repository could not support

The same mistake five times, and worth naming: **a single-sample A/B against a
non-deterministic model does not support a performance claim.**

| Lesson                        | The claim                                                  | What actually happened                                                                                                                       |
| ----------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **29** fine-grained streaming | eager streaming lowers time-to-first-fragment              | It was _slower_ and produced _fewer, larger_ fragments — and the two runs generated different payloads, so the timings were never comparable |
| **31** web search             | dynamic filtering reduces tokens                           | The newer tool used **more** input tokens in both languages, because the model chose to search twice instead of once                         |
| **39** extended thinking      | shows thinking summaries at each effort                    | The chosen problem was easy enough that adaptive thinking **declined to think** — zero blocks                                                |
| **61** evaluator-optimizer    | the loop iterates on failures                              | Converged 7/7 on round 1; the loop never ran                                                                                                 |
| **66** environment inspection | the blind agent "plausibly succeeds and actually does not" | Both agents passed                                                                                                                           |

All five now report the normalising figure (tokens per search, fragments per KB) and say
plainly what the measurement can and cannot show. Lessons 39 and 61 were given harder
inputs so they demonstrate their mechanism; 66 was reframed around what is true whatever
the run does — the blind agent _claimed_ success and had no way to know.

### Gold labels that could not be defended

The eval lessons disagreed with the model on three cases, and on inspection **the model
was defensible and the labels were not**: the `urgency` rubric was undecidable at the
medium/high boundary. Fixed by making the rule decidable rather than by fitting the
labels to the model — see the `labelling_rule` field now in both datasets, and the
commit for the per-label audit.

---

## What each lesson actually demonstrated

The runs worth citing, because they prove a claim rather than merely exiting 0:

| Lesson | Live evidence                                                                                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **06** | Python `TypeError` locally, TypeScript `400 temperature is deprecated for this model` — the two different failure modes, as documented                                          |
| **08** | `400 This model does not support assistant message prefill`                                                                                                                     |
| **23** | Both adoption errors reproduced: `additionalProperties: true is not supported`, and `tool_choice.tool.strict: Extra inputs are not permitted`                                   |
| **24** | Blocks came back as `thinking, text, tool_use` — so `content[1]` was **text** and the Academy pattern would have failed. The repository's central claim, proven                 |
| **28** | 3 tool calls in one turn (2 turns total) vs 1-per-turn under `disable_parallel_tool_use` (4 turns)                                                                              |
| **30** | The model probed `view /` and `view /repo`, was refused by the path guard, and recovered from the `is_error` results                                                            |
| **39** | 1 readable thinking block at both efforts; with `display` defaulted, 1 block present with **empty text** — the surprise, demonstrated                                           |
| **40** | base64 and `file_id` cost **identically** (733 tokens): a `file_id` saves the upload, not the tokens                                                                            |
| **42** | **5 citations checked, 0 mismatched** against the source text; and the `citations` + `output_config.format` 400                                                                 |
| **43** | Stable prefix: ~7,845 tokens read from cache each turn. With a timestamp injected: **0 reads, every turn**                                                                      |
| **45** | Agent loop billed-equivalent 35,444 uncached → 13,980 with one line of top-level `cache_control`                                                                                |
| **46** | Produced and downloaded a real 71 KB PNG chart from the sandbox                                                                                                                 |
| **48** | All three transports — in-process, stdio subprocess, Streamable HTTP on a real port — in both languages                                                                         |
| **50** | The real `ModuleNotFoundError` for `mcp.server.fastmcp`, whose message names `MCPServer` and the `mcp<2` pin                                                                    |
| **54** | The binary `blob` branch fired on a real PNG resource                                                                                                                           |
| **61** | 7/9 → 8/9 → 7/9, stopping on the round limit — the loop and the bound. Varies by run: a later run passed 9/9 first time, and the example says so rather than pretending         |
| **62** | 3.4× speedup, sequential vs concurrent, same specialists and input                                                                                                              |
| **63** | All four gates passed with real content: 12 events, justified SEV1, 331 words, 8 owned actions                                                                                  |
| **64** | All four routes correct including the `other` fallback, with `effort` shown as `n/a (unsupported)` on the Haiku branches                                                        |
| **65** | The narrow agent's `issue_refund(txn_9002, 900.0)` was **REJECTED — exceeds the 50.0 limit; needs human approval**, while the broad agent's audit log is two opaque SQL strings |

---

## Running it yourself

```bash
cp .env.example .env      # ANTHROPIC_API_KEY, and VOYAGE_API_KEY for 34/36/38
npm run lesson -- 01      # spends no output tokens; verifies the key and the models
uv run lesson 01
```

### Cost

The full pass — every lesson, both languages, plus re-runs of the ten lessons that were
fixed — was well under **$5** at the default models. Uneven, though:

| Lesson         | Why it costs more                                                        |
| -------------- | ------------------------------------------------------------------------ |
| **31**         | Web search is $10/1,000 searches on top of tokens, and results are large |
| **39**         | Thinking tokens. `--efforts low,high` avoids the `max` sweep             |
| **46**         | Long sandbox turns                                                       |
| **45**         | Four agent loops over a deliberately large system prompt                 |
| **65**, **66** | Multi-turn agent loops, ~40–50s each                                     |

Everything else is cents. Spend cannot be measured from a standard API key — the Admin
API (`/v1/organizations/cost_report`) requires an `sk-ant-admin…` key, and there is no
balance endpoint at all. Remaining credit is Console-only.

### What a live pass should check beyond "it ran"

The `legacy.*` files are expected to fail, and each detects which case it is in:

| Lesson | On `claude-sonnet-5`                                            | On a pre-4.7 model |
| ------ | --------------------------------------------------------------- | ------------------ |
| 06     | Python `TypeError`; TypeScript 400                              | accepted           |
| 08     | 400 on the prefill                                              | accepted           |
| 39     | 400 on `budget_tokens`                                          | accepted           |
| 46     | 400 on the tool version, or 0 blocks found by the legacy parser | —                  |

**A legacy file that succeeds on a current model is a finding, not a pass.**

---

## Updating this file

When you re-run, change the badge only for lessons you actually ran, and say which model.
A verification claim without a model is not a claim.
