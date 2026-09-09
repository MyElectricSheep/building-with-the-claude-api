# Where the previous repository went

The first version of this repository was nine TypeScript files at the root plus a
`tools.json`. Everything in them has an equivalent in `lessons/`, and the good ideas were
kept — several of them were already ahead of the Academy course (`output_config.format`,
`code_execution_20260521`, `voyage-4-lite`, block-type narrowing).

This file records the mapping so nothing looks like it vanished.

| Previous file                | Now                                                                                                                                   | What changed                                                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `01.prompting.ts`            | [16](../lessons/16-being-clear-and-direct/), [17](../lessons/17-being-specific/)                                                      | The meal-plan prompt became two graded prompting lessons, so "clearer is better" is measured rather than asserted                                                                                |
| `02.tools.ts`                | [25](../lessons/25-sending-tool-results/), [27](../lessons/27-implementing-multiple-turns/)                                           | The weather/datetime loop became the tool-result round trip and the manual-loop-vs-tool-runner comparison. The structured-output summary pattern survives in `shared/*/triage`                   |
| `03.multi-tools.ts`          | [28](../lessons/28-using-multiple-tools/)                                                                                             | Rewritten around **parallel** tool calls, which the original did not exercise                                                                                                                    |
| `04.full-rag.ts`             | [35](../lessons/35-the-full-rag-flow/), [36](../lessons/36-implementing-the-rag-flow/), [38](../lessons/38-multi-index-rag-pipeline/) | Split into the pipeline, the hardened version (contextual prefixes, citations, score floor) and the hybrid/rerank version. The Voyage REST wrapper survives as `shared/typescript/embeddings.ts` |
| `05.extended-thinking.ts`    | [39](../lessons/39-extended-thinking/)                                                                                                | The `--mode manual` branch became `legacy.ts`; adaptive/effort became the main path                                                                                                              |
| `06.image-support.ts`        | [40](../lessons/40-image-support/)                                                                                                    | Added the Files API source type and the corrected limits                                                                                                                                         |
| `07.pdf-support.ts`          | [41](../lessons/41-pdf-support/)                                                                                                      | Added `file_id` reuse across several questions, and citations                                                                                                                                    |
| `08.prompt-caching.ts`       | [43](../lessons/43-prompt-caching/), [44](../lessons/44-rules-of-prompt-caching/), [45](../lessons/45-prompt-caching-in-action/)      | Split into mechanics, rules (with a static invalidator audit), and the cost comparison                                                                                                           |
| `09.code-execution-files.ts` | [46](../lessons/46-code-execution-and-files-api/)                                                                                     | Kept `code_execution_20260521`; fixed the result-block parsing, which still checked for `code_execution_output`                                                                                  |
| `tools.json`                 | `shared/typescript/tools.ts` · `shared/python/course/tools.py`                                                                        | Became typed definitions with `strict: true`, `additionalProperties: false`, and unit tests                                                                                                      |
| `code-execution-output/`     | `outputs/` (git-ignored)                                                                                                              | Generated artefacts should not be committed                                                                                                                                                      |
| `photos/`, `pdf/`            | `assets/images/`, `assets/pdf/`                                                                                                       | Same files, moved with `git mv` so history follows                                                                                                                                               |

## What was deliberately dropped

- **The open-meteo weather tool.** It was a good demo, but it made a lesson depend on a
  third-party API being up. The tool-use lessons now use a local reminder domain
  (`shared/*/tools`) and a local city lookup (`shared/*/cities`), both unit-tested, so
  the lessons test _tool use_ rather than the network.
- **`claude-opus-4-6` / `claude-sonnet-4-6` / `claude-haiku-4-5` hardcoded per file.**
  Model choice moved to one place. See [MODELS.md](MODELS.md).
- **Per-file `parseArgs` help text.** Replaced by the lesson runner plus each lesson's
  README.

Nothing was deleted without an equivalent. If you want the originals, they are in the
git history at the commit before this one.
