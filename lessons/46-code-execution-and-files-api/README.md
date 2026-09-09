# 46 · Code execution and the Files API

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 46, _Code execution and the Files API_
>
> **2026 status: 🟠 Legacy tool version, and the response shape changed too**

## What the lesson teaches

Give Claude a sandbox. It writes and runs code, reads files you upload, and produces
files you download. Excellent concept, completely current.

## What the Academy does

```python
tools=[{"type": "code_execution_20250522", "name": "code_execution"}]
...
if block.type == "code_execution_output":
    ...
```

## What changed

Both halves — the tool version **and** the way you read the result.

### The tool versions

| `type`                    | What it is                                                                    |
| ------------------------- | ----------------------------------------------------------------------------- |
| `code_execution_20250522` | **legacy** — Python only                                                      |
| `code_execution_20250825` | Bash + file operations                                                        |
| `code_execution_20260120` | adds persistent REPL state and **programmatic tool calling**                  |
| `code_execution_20260521` | current latest — same runtime, exposes the 90-second per-cell limit to Claude |

These are **capability-keyed**, not a deprecation chain: `20260120` is still current if
you want programmatic tool calling. Use `20260521` unless you have a reason not to.

### The result blocks

This is the part that silently breaks copied code. A bare `code_execution_output` block
is not what current versions return. You get:

| Block type                               | Contains                                                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `server_tool_use`                        | what Claude is about to run                                                                                            |
| `bash_code_execution_tool_result`        | `.content` → `bash_code_execution_result` with `stdout`, `stderr`, `return_code`, and a `content` list of output files |
| `text_editor_code_execution_tool_result` | file operations inside the sandbox                                                                                     |

An **error** arrives as `.content` being an error object rather than a result — check
`.content.type` before reading `.stdout`.

### Files in, files out

- **In:** upload with `client.files.upload(...)`, then reference in the message as
  `{"type": "container_upload", "file_id": ...}` — note this is _not_ a `document`
  block.
- **Out:** generated files appear as `bash_code_execution_output` entries with a
  `file_id`. Fetch metadata with `client.files.retrieve_metadata(...)` and bytes with
  `client.files.download(...)`.

**Sanitise the filename before writing it.** `metadata.filename` comes from the sandbox;
`os.path.basename` / `path.basename` it and reject `.`/`..`, or a generated name is a
path traversal in your own process.

### Containers persist

`response.container.id` can be passed as `container=` on a later request to reuse the
same sandbox — installed packages and files included.

### The Files API is out of beta

`client.files.*`, no beta header. Files persist until deleted; 500 MB per file, 100 GB
per organisation. Only files **created by code execution or skills** can be downloaded —
not ones you uploaded.

## The current implementation

Uploads a small CSV, asks Claude to analyse it and produce a chart, then:

- walks the response with the **correct** block types, including the error shape;
- prints stdout, stderr and the return code;
- downloads every generated file into `outputs/` with a sanitised name;
- reuses the container for a follow-up question to show the REPL state persisting;
- deletes the uploaded file.

`legacy.*` shows the Academy's tool version and result-parsing side by side with what
the current API actually returns.

## Python vs TypeScript

Identical. `file_content.write_to_file(path)` in Python; in TypeScript, read the
`arrayBuffer()` from the download response and write it yourself.

## Run it

```bash
npm run lesson -- 46
uv run lesson 46
```

Writes to `outputs/`, which is git-ignored. This lesson is slower than the others —
the sandbox has to start.

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Code execution tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool)
- [Files API](https://platform.claude.com/docs/en/build-with-claude/files)
- [Tool reference](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference)
- [Programmatic tool calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)
