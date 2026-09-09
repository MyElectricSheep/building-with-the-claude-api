# 23 · Tool schemas

> Academy course: [Building with the Claude API](https://academy.claude.com/courses/building-with-the-claude-api) — lesson 23, _Tool schemas_
>
> **2026 status: 🟡 Current, but missing the one feature that changed this**

## What the lesson teaches

A tool definition is `name`, `description`, `input_schema`. The description is a prompt
— it is how the model decides _whether_ and _when_ to call the tool, so it is worth
writing carefully.

All still correct.

## What the Academy does

```python
tool = {
    "name": "get_current_datetime",
    "description": "Gets the current date and time",
    "input_schema": {"type": "object", "properties": {}},
}
```

## What changed

**`strict: true`.** It did not exist when the course was recorded, and it is the
single most useful addition to tool definitions since.

```python
tool = {
    "name": "get_current_datetime",
    "description": "Gets the current date and time",
    "strict": True,                       # <- new
    "input_schema": {
        "type": "object",
        "properties": {},
        "additionalProperties": False,    # <- required by strict
    },
}
```

With `strict: true` the schema becomes a **generation constraint**: Claude's
`tool_use.input` is guaranteed to validate. Without it, the schema is a description the
model usually follows.

Three details:

- `strict` goes on the **tool definition**, alongside `name`/`description`/
  `input_schema` — **not** on `tool_choice`. This is the most common mistake.
- Every object in the schema needs `required` and `additionalProperties: false`.
- Grammar compilation is cached for 24 hours, so the first strict call with a new
  schema costs slightly more latency than the ones after it.

### What a good description contains

The description is where the _behavioural_ rules live, because they cannot be
expressed in JSON Schema:

```
"Return the current date and time in UTC, ISO 8601. Call this before any
 relative date arithmetic - never guess the current time."
```

The second sentence is not decoration. It is what stops the model computing
"a week from now" from a hallucinated today.

### And what strict does not do

`strict` constrains the **shape**. It does not check that the values are sensible, and
it emphatically does not authorise anything. A schema-valid
`issue_refund(transaction_id, amount)` is still a refund you may not be allowed to
issue. Keep the validation from lesson 22.

## The current implementation

Runs the same request against a **loose** schema and a **strict** one, printing the
arguments Claude produced in each case, then demonstrates the two errors people
actually hit:

- `strict: true` with `additionalProperties` left off → 400
- `strict` placed on `tool_choice` instead of the tool → 400

Both errors are caught and printed rather than crashing, so you can read what the API
says.

## Python vs TypeScript

Identical. In TypeScript, `strict` is a field on `Anthropic.Tool`.

## Run it

```bash
npm run lesson -- 23
uv run lesson 23
```

## Environment variables

- `ANTHROPIC_API_KEY`

## References

- [Strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use)
- [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)
- [Tool reference — tool definition properties](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference)
