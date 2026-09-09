/**
 * Lesson 11 - Generating test datasets.
 *
 * Generate candidate cases with a cheap model under a JSON Schema, validate
 * what code can validate, and write them out marked unreviewed. Curation stays
 * human.
 *
 * No `temperature`, no assistant prefill - both are gone from the current API.
 *
 *   npm run lesson -- 11
 *   npm run lesson -- 11 -- --count 8
 */
import { writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { parseStructured } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { FAST_MODEL } from "../../../shared/typescript/config.ts";
import { validateCases } from "../../../shared/typescript/dataset.ts";
import type { GeneratedCase } from "../../../shared/typescript/dataset.ts";
import { CATEGORIES, URGENCIES } from "../../../shared/typescript/triage.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUTPUT_PATH = join(REPO_ROOT, "assets", "eval", "generated.json");

const GENERATION_SCHEMA = {
  type: "object",
  properties: {
    cases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          input: { type: "string" },
          expected: {
            type: "object",
            properties: {
              category: { type: "string", enum: [...CATEGORIES] },
              urgency: { type: "string", enum: [...URGENCIES] },
              has_order_id: { type: "boolean" },
            },
            required: ["category", "urgency", "has_order_id"],
            additionalProperties: false,
          },
        },
        required: ["id", "input", "expected"],
        additionalProperties: false,
      },
    },
  },
  required: ["cases"],
  additionalProperties: false,
} as const;

const SYSTEM = `You write test cases for a customer-support triage classifier.

Each case is a realistic support email plus the labels a careful human would
assign. Vary length, tone, and how obvious the label is: include at least one
case that is genuinely ambiguous between two categories, and at least one where
the writer says something is urgent but it is not.

Use a short kebab-case id describing the email. Only include an order identifier
in the text when has_order_id is true.`;

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { count: { type: "string", default: "5" } },
});

const client = createClient();

// Note the model: generate with a DIFFERENT model than the one under test where
// you can. A model writing its own exam writes questions it can answer.
const response = await client.messages.create({
  model: FAST_MODEL,
  max_tokens: 2000,
  system: SYSTEM,
  messages: [
    { role: "user", content: `Write ${values.count} support-email test cases.` },
  ],
  output_config: { format: { type: "json_schema", schema: GENERATION_SCHEMA } },
});

const payload = parseStructured<{ cases: GeneratedCase[] }>(response);
const { accepted, issues } = validateCases(payload.cases);

console.log(`generated ${payload.cases.length} | accepted ${accepted.length}`);
for (const issue of issues) {
  console.log(`  rejected ${issue.id}: ${issue.problem}`);
}

writeFileSync(
  OUTPUT_PATH,
  `${JSON.stringify(
    {
      description:
        "Machine-generated candidate cases. Every case is reviewed=false until " +
        "a human has checked it.",
      generated_by: FAST_MODEL,
      cases: accepted,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`\nwrote ${relative(REPO_ROOT, OUTPUT_PATH)}`);
console.log(
  "Every case is marked reviewed=false. Lesson 12 refuses to score unreviewed " +
    "cases - generated data is a candidate, not ground truth.",
);
