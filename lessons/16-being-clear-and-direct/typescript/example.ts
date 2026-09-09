/**
 * Lesson 16 - Being clear and direct.
 *
 * Three prompts for one task, graded by code rather than by eye. "Good output"
 * and "the output I asked for" are different measurements.
 *
 *   npm run lesson -- 16
 */
import { parseStructured, textOf } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { FAST_MODEL } from "../../../shared/typescript/config.ts";
import {
  avoidsPhrases,
  matchesPattern,
  withinWordCount,
} from "../../../shared/typescript/graders.ts";

const FACTS = `Product: Kestrel CLI
Released: 2026-03-04
What it does: formats and lints SQL migration files
Notable: runs offline; no config file required`;

const VAGUE = "Tell me about this product.";

const CLEAR = `Write release-note copy for this product.

Requirements:
- Between 25 and 60 words.
- Start with the product name. No preamble, no "Sure" or "Here is".
- Include the release date exactly as given.
- Plain prose, no bullet points.`;

const SCHEMA = {
  type: "object",
  properties: { copy: { type: "string" } },
  required: ["copy"],
  additionalProperties: false,
} as const;

const GRADERS = {
  "word count": withinWordCount(25, 60),
  "no preamble": avoidsPhrases(["Sure,", "Certainly", "Here is", "Here's"]),
  "has date": matchesPattern(/2026-03-04/, "release date"),
};

function grade(label: string, output: string): void {
  console.log(`--- ${label} ---`);
  console.log(output.trim());
  console.log();
  for (const [name, grader] of Object.entries(GRADERS)) {
    const result = grader(output);
    const mark = result.score >= 1 ? "PASS" : "FAIL";
    console.log(`  ${mark}  ${name.padEnd(12)} ${result.reason}`);
  }
  console.log();
}

const client = createClient();

for (const [label, prompt] of [
  ["vague", VAGUE],
  ["clear", CLEAR],
] as const) {
  const response = await client.messages.create({
    model: FAST_MODEL,
    max_tokens: 400,
    messages: [{ role: "user", content: `${prompt}\n\n${FACTS}` }],
  });
  grade(label, textOf(response));
}

// Clear instructions AND a schema. Saying it in words is good; constraining the
// shape is better - see lesson 8.
const structured = await client.messages.create({
  model: FAST_MODEL,
  max_tokens: 400,
  messages: [{ role: "user", content: `${CLEAR}\n\n${FACTS}` }],
  output_config: { format: { type: "json_schema", schema: SCHEMA } },
});
grade("clear + schema", parseStructured<{ copy: string }>(structured).copy);

console.log(
  "The vague prompt usually produces perfectly reasonable prose that fails\n" +
    "the format graders. Clear instructions fix the format; a schema removes\n" +
    "the question of whether the wrapper parses at all.",
);
