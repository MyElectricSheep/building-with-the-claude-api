/**
 * Lesson 62 - Parallelization.
 *
 * Three specialists on the same input, then an aggregator. Run sequentially and
 * concurrently, with wall-clock for each, so the latency claim is measured.
 *
 *   npm run lesson -- 62
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseStructured, textOf } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { FAST_MODEL } from "../../../shared/typescript/config.ts";
import { mapWithConcurrency } from "../../../shared/typescript/eval.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const NOTES = readFileSync(join(REPO_ROOT, "assets", "data", "incident.md"), "utf8");

const FINDING_SCHEMA = {
  type: "object",
  properties: {
    findings: { type: "array", items: { type: "string" } },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
  },
  required: ["findings", "confidence"],
  additionalProperties: false,
} as const;

interface Finding {
  findings: string[];
  confidence: string;
}

// Each specialist gets a focused prompt and a clean context. That is the half of
// this pattern that is about QUALITY rather than latency.
const SPECIALISTS: Record<string, string> = {
  timeline:
    "You extract incident timelines. List each significant event as " +
    "'HH:MM - what happened'. Detection, declaration, mitigation, resolution. " +
    "Nothing else.",
  detection:
    "You analyse why an incident was not caught earlier. Focus on monitoring, " +
    "canaries and tests. Each finding names the specific mechanism that failed " +
    "and why.",
  process:
    "You analyse incident process and communications: roles, decisions, who was " +
    "informed. Blameless - describe what made the mistake easy to make, never " +
    "who made it.",
};

const client = createClient();
const names = Object.keys(SPECIALISTS);

async function runSpecialist(name: string): Promise<[string, Finding]> {
  const response = await client.messages.create({
    model: FAST_MODEL,
    max_tokens: 800,
    system: SPECIALISTS[name]!,
    messages: [{ role: "user", content: `<notes>\n${NOTES}\n</notes>` }],
    output_config: { format: { type: "json_schema", schema: FINDING_SCHEMA } },
  });
  return [name, parseStructured<Finding>(response)];
}

async function aggregate(results: Record<string, Finding>): Promise<string> {
  // The aggregator merges DATA, not prose - that is what the structured
  // specialist output buys you.
  const response = await client.messages.create({
    model: FAST_MODEL,
    max_tokens: 1200,
    system:
      "You merge specialist findings into one blameless incident retrospective. " +
      "Do not add facts the specialists did not report. Under 300 words.",
    messages: [{ role: "user", content: JSON.stringify(results) }],
  });
  return textOf(response).trim();
}

function report(results: Record<string, Finding>): void {
  for (const [name, result] of Object.entries(results)) {
    console.log(
      `  ${name.padEnd(10)} ${result.findings.length} findings, ` +
        `confidence ${result.confidence}`,
    );
  }
}

console.log(`${names.length} specialists on the same input, model ${FAST_MODEL}\n`);

console.log("--- sequential ---");
let started = Date.now();
const sequential: Record<string, Finding> = {};
for (const name of names) {
  const [key, value] = await runSpecialist(name);
  sequential[key] = value;
}
const sequentialMs = Date.now() - started;
report(sequential);
console.log(`  wall clock: ${sequentialMs} ms\n`);

console.log("--- concurrent ---");
started = Date.now();
const pairs = await mapWithConcurrency(names, 3, (name) => runSpecialist(name));
const concurrentMs = Date.now() - started;
const concurrent = Object.fromEntries(pairs);
report(concurrent);
console.log(`  wall clock: ${concurrentMs} ms`);
console.log(
  `  speedup:    ${(concurrentMs > 0 ? sequentialMs / concurrentMs : 0).toFixed(1)}x\n`,
);

console.log("--- aggregated ---\n");
console.log(await aggregate(concurrent));

console.log(
  "\nLatency is only half the argument. The other half is that each\n" +
    "specialist got a focused prompt and a clean context, instead of one\n" +
    "prompt trying to do three jobs - and that holds even when you run them\n" +
    "sequentially.\n\n" +
    "This is layer A: parallel REQUESTS. Layer B is parallel tool calls\n" +
    "inside one turn (lesson 28); layer C is context-isolated parallel\n" +
    "agents on Managed Agents.",
);
