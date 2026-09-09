# 08 · Structured data

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 8, _Structured data_
>
> **2026 status: 🔴 Deprecated technique — replaced by a strictly better one**

Along with lesson 6, this is the other lesson where the Academy code errors on current
models. It is also the lesson where the replacement is a genuine upgrade rather than a
workaround.

## What the lesson teaches

Getting machine-readable JSON out of a model that fundamentally emits text. The
Academy's technique is **assistant prefilling plus stop sequences**:

````python
add_user_message(messages, "Generate a very short EventBridge rule as JSON")
add_assistant_message(messages, "```json")          # prefill
text = chat(messages, stop_sequences=["```"])        # stop at the closing fence
````

You seed the assistant turn with an opening fence so the model has no choice but to
continue inside it, and you stop generation at the closing fence.

## What changed

**Prefilling a final assistant turn returns a 400** on Claude Sonnet 5, Opus 5, Opus
4.6/4.7/4.8, Sonnet 4.6 and the Fable family. The whole technique is unavailable.

Note carefully what is _not_ deprecated:

- **Complete prior assistant turns are fine.** Removing the _partial trailing_ prefill
  is not the same as removing conversation history. Lesson 4 is unaffected.
- **`stop_sequences` is not deprecated** either. It is simply no longer the way to
  bound JSON.

### The replacement: structured outputs

`output_config.format` constrains generation to a JSON Schema. The model _cannot_
emit non-conforming JSON — this is constrained decoding, not a prompt asking nicely.

```python
response = client.messages.create(
    model=MODEL,
    max_tokens=1000,
    messages=[{"role": "user", "content": "Generate a short EventBridge rule."}],
    output_config={"format": {"type": "json_schema", "schema": SCHEMA}},
)
```

Two API-shape notes:

- The older **`output_format` top-level parameter is deprecated** in favour of
  `output_config.format`. The Python SDK v1 removed `output_format` from
  `messages.create()` entirely — it survives only on `messages.parse()`, where it takes
  a Pydantic model.
- The `structured-outputs-2025-11-13` beta header is **no longer required**.

### Schema restrictions worth knowing

Structured outputs support a subset of JSON Schema. Supported: object/array/string/
integer/number/boolean/null, `enum`, `const`, `anyOf`, `$ref`/`$defs`, `default`, string
`format`, `minItems` of 0 or 1. **Not** supported: recursive schemas, external `$ref`,
`minimum`/`maximum`, `minLength`/`maxLength`, regex `pattern`, or `additionalProperties`
set to anything but `false`. Objects need `required` and `additionalProperties: false`.

### Structured output is not validation

A schema guarantees _shape_, not _truth_, and not _authorisation_. You still have to
handle `stop_reason == "refusal"`, `stop_reason == "max_tokens"` (truncated JSON will
not parse), API errors, and business rules. The shared `parseStructured` /
`parse_structured` helper does the first two.

The Academy's own EventBridge schema also left the nested `detail` object open. This
repository closes it with `additionalProperties: false`, which is required anyway.

## The current implementation

- `example.*` — the EventBridge rule via `output_config.format`, plus the
  typed-model path (Pydantic `messages.parse` / Zod `zodOutputFormat`), plus a
  deliberate refusal/truncation check.
- `legacy.*` — the prefill + stop-sequence technique, preserved. Expected to 400.

## Python vs TypeScript

Both SDKs offer a _typed_ path that is nicer than hand-writing the schema:

|            | Typed path                                                                                                    | Raw schema path                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Python     | `client.messages.parse(output_format=PydanticModel)` → `response.parsed_output`                               | `messages.create(output_config={"format": {...}})`      |
| TypeScript | `client.messages.parse({ output_config: { format: zodOutputFormat(ZodSchema) } })` → `response.parsed_output` | `messages.create({ output_config: { format: {...} } })` |

`parsed_output` can be `null` if parsing fails — guard it.

## Run it

```bash
npm run lesson -- 08
uv run lesson 08

npm run lesson -- 08 legacy   # the prefill technique, and the 400 it now returns
uv run lesson 08 legacy
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide)
- [Working with the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages)
