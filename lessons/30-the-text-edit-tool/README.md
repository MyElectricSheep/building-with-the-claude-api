# 30 · The text edit tool

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 30, _The text edit tool_
>
> **2026 status: 🟠 Read it for the architecture, not for the code**

## What the lesson teaches

The architectural idea, which is excellent and unchanged:

> Claude produces **structured editing instructions**. Your environment performs the
> edits.

The text editor is an **Anthropic-defined client tool**: Anthropic fixes the schema
(you supply no `input_schema`), and your application executes every command.

## What the Academy does

```python
{"type": "text_editor_20250124", "name": "str_replace_editor"}
```

…and describes an `undo_edit` command.

## What changed

| Academy                | 2026                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `text_editor_20250124` | **`text_editor_20250728`** for Claude 4 and later                                               |
| `str_replace_editor`   | **`str_replace_based_edit_tool`**                                                               |
| `undo_edit` command    | **Removed** in `text_editor_20250429`. Do not implement it, and do not tell the model it exists |
| —                      | **`max_characters`** (new in `20250728`): truncate `view` output for large files                |

The `type` and `name` must match: `str_replace_based_edit_tool` with
`text_editor_20250124` is a type error in TypeScript and a 400 from the API.

`text_editor_20250124` has not been withdrawn — it is the version for pre-Claude-4
models. This is a **model-keyed** version pair, not a deprecation.

### The four commands you must implement

| Command       | Input                                                                | What you do                                                                              |
| ------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `view`        | `path`, optional `view_range` `[start, end]` (1-indexed, `-1` = end) | Return file contents, or a directory listing. Truncate to `max_characters` if you set it |
| `str_replace` | `path`, `old_str`, `new_str`                                         | Replace **exactly one** occurrence. Zero matches or more than one → `is_error`           |
| `create`      | `path`, `file_text`                                                  | Write a new file                                                                         |
| `insert`      | `path`, `insert_line` (0 = start of file), `insert_text`             | Insert after that line                                                                   |

Anything else — including `undo_edit` — gets an `is_error` result naming the supported
commands.

### Because your process does the writing, you own the safety

This is the part the lesson does not dwell on and production code must:

- **Confine paths to a root.** Resolve the path and reject anything that escapes.
  `../../.ssh/id_rsa` is a perfectly reasonable-looking `path` for a model to emit.
- **Back up before editing.** Anthropic's own guidance recommends it, and `undo_edit`
  no longer exists to save you.
- **Enforce the single-match rule** on `str_replace`. A silent replace-all is a
  corrupted file.
- **Return errors as `is_error` results**, not exceptions — the model can then correct
  itself.

## The current implementation

A sandboxed editor over `assets/sandbox/` (created and reset on each run). It gives
Claude a small Python file with a real bug and asks it to fix it. You will see `view`,
then `str_replace`, then the model's explanation.

**Expect the model to probe first.** On the run this repository was verified against it
tried `view /`, then `view /repo`, before `view .` — the first two were refused with
`Path escapes the sandbox`, and it recovered and carried on. That is not noise: it is
the path guard doing its job and the `is_error` result letting the model correct itself.
A handler that raised instead of returning an error result would have ended the turn
there.

Every command goes through a path guard, a backup, and the single-match check. The
example also sends a synthetic `undo_edit` call through the handler so you can see the
error a model attempting it would receive.

## Python vs TypeScript

Identical. In TypeScript, `type`/`name` mismatches are caught at compile time by the
`ToolTextEditor20250728` interface.

## Run it

```bash
npm run lesson -- 30
uv run lesson 30
```

Files are written under `assets/sandbox/`, which is git-ignored.

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Text editor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool)
- [Tool reference](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference)
- [Migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide)
