/**
 * Lesson 8 - Structured data with structured outputs.
 *
 * Replaces the Academy's prefill + stop_sequences trick, which now returns a 400.
 *
 *   npm run lesson -- 08
 */
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { parseStructured } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";

const PROMPT =
  "Generate a short AWS EventBridge rule that matches EC2 instance " +
  "state-change notifications for terminated instances.";

// Hand-written schema. Note `additionalProperties: false` on BOTH objects - the
// Academy's version left the nested `detail` object open, and structured outputs
// require it closed anyway.
const EVENTBRIDGE_SCHEMA = {
  type: "object",
  properties: {
    source: { type: "array", items: { type: "string" } },
    "detail-type": { type: "array", items: { type: "string" } },
    detail: {
      type: "object",
      properties: { state: { type: "array", items: { type: "string" } } },
      required: ["state"],
      additionalProperties: false,
    },
  },
  required: ["source", "detail-type", "detail"],
  additionalProperties: false,
} as const;

interface EventBridgeRule {
  source: string[];
  "detail-type": string[];
  detail: { state: string[] };
}

const client = createClient();

console.log("--- output_config.format with a raw JSON Schema ---");
const raw = await client.messages.create({
  model: MODEL,
  max_tokens: 1000,
  messages: [{ role: "user", content: PROMPT }],
  output_config: { format: { type: "json_schema", schema: EVENTBRIDGE_SCHEMA } },
});
// parseStructured checks stop_reason first: a refusal or a max_tokens
// truncation produces text that will not parse.
const rule = parseStructured<EventBridgeRule>(raw);
console.log(JSON.stringify(rule, null, 2));

// The same shape, expressed as a Zod schema. zodOutputFormat generates the JSON
// Schema and wires up parsing.
const EventBridgeRuleSchema = z.object({
  source: z.array(z.string()),
  "detail-type": z.array(z.string()),
  detail: z.object({ state: z.array(z.string()) }),
});

console.log("\n--- messages.parse with a Zod schema ---");
const parsed = await client.messages.parse({
  model: MODEL,
  max_tokens: 1000,
  messages: [{ role: "user", content: PROMPT }],
  output_config: { format: zodOutputFormat(EventBridgeRuleSchema) },
});

if (parsed.parsed_output === null) {
  console.log(`parsed_output was null (stop_reason: ${parsed.stop_reason})`);
} else {
  console.log(`source:      ${parsed.parsed_output.source.join(", ")}`);
  console.log(`detail-type: ${parsed.parsed_output["detail-type"].join(", ")}`);
  console.log(`states:      ${parsed.parsed_output.detail.state.join(", ")}`);
  console.log(
    "\nThe model could not have returned a non-conforming shape: this is\n" +
      "constrained decoding, not a prompt politely asking for JSON.",
  );
}
