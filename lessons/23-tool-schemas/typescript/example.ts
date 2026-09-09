/**
 * Lesson 23 - Tool schemas, and the `strict` flag the Academy predates.
 *
 * Same request, loose schema vs strict schema, then the two errors people
 * actually hit when adopting strict.
 *
 *   npm run lesson -- 23
 */
import Anthropic from "@anthropic-ai/sdk";
import { toolUses } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";

const REQUEST = "What is 90 minutes after 2026-09-09T13:36:00Z?";

// The Academy shape: a description, an open schema, no constraint.
const LOOSE_TOOL: Anthropic.Tool = {
  name: "add_duration_to_datetime",
  description: "Adds time to a datetime",
  input_schema: {
    type: "object",
    properties: {
      datetime: { type: "string" },
      amount: { type: "number" },
      unit: { type: "string" },
    },
  },
};

// The 2026 shape. `strict` turns the schema into a generation constraint, and
// the description carries the behavioural rule the schema cannot express.
const STRICT_TOOL: Anthropic.Tool = {
  name: "add_duration_to_datetime",
  description:
    "Shift an ISO 8601 UTC datetime by a signed amount. Use a negative " +
    "amount to go backwards. Never guess the base datetime - it must come " +
    "from get_current_datetime or from the user.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      datetime: {
        type: "string",
        description: "ISO 8601 UTC instant, e.g. 2026-09-09T13:00:00Z",
      },
      amount: { type: "number", description: "May be negative." },
      unit: { type: "string", enum: ["minutes", "hours", "days", "weeks"] },
    },
    required: ["datetime", "amount", "unit"],
    additionalProperties: false,
  },
};

const client = createClient();

async function call(tool: Anthropic.Tool, label: string): Promise<void> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    tools: [tool],
    messages: [{ role: "user", content: REQUEST }],
  });
  console.log(`--- ${label} ---`);
  const calls = toolUses(response);
  if (calls.length === 0) console.log("  (no tool call)");
  for (const toolCall of calls) {
    console.log(`  ${toolCall.name}(${JSON.stringify(toolCall.input)})`);
  }
  console.log();
}

await call(LOOSE_TOOL, "loose schema - the arguments are a hope");
await call(STRICT_TOOL, "strict schema - the arguments are guaranteed");

console.log("--- error 1: strict without additionalProperties: false ---");
try {
  await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    tools: [
      {
        ...STRICT_TOOL,
        input_schema: { ...STRICT_TOOL.input_schema, additionalProperties: true },
      },
    ],
    messages: [{ role: "user", content: REQUEST }],
  });
  console.log("  (accepted - check the current strict requirements)");
} catch (error) {
  if (error instanceof Anthropic.BadRequestError)
    console.log(`  400: ${error.message}`);
  else throw error;
}

console.log("\n--- error 2: strict on tool_choice instead of the tool ---");
try {
  const { strict: _strict, ...withoutStrict } = STRICT_TOOL;
  await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    tools: [withoutStrict],
    // `strict` belongs on the TOOL, never here. This is the most common mistake
    // when adopting it. TypeScript rejects the extra property, so it is cast -
    // which is exactly what a JavaScript user would hit at runtime instead.
    tool_choice: {
      type: "tool",
      name: "add_duration_to_datetime",
      strict: true,
    } as unknown as Anthropic.ToolChoice,
    messages: [{ role: "user", content: REQUEST }],
  });
  console.log("  (accepted - the field was ignored)");
} catch (error) {
  if (error instanceof Anthropic.BadRequestError)
    console.log(`  400: ${error.message}`);
  else throw error;
}

console.log(
  "\nstrict constrains the SHAPE. It does not check that values are sensible\n" +
    "and it does not authorise anything - keep the validation from lesson 22.",
);
