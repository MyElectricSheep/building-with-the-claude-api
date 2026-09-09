/**
 * Lesson 39 - Adaptive thinking and effort.
 *
 * `budget_tokens` is gone. Reasoning is on by default and you tune the budget
 * with output_config.effort - which is NOT a temperature replacement.
 *
 *   npm run lesson -- 39
 *   npm run lesson -- 39 -- --efforts low,high
 */
import { parseArgs } from "node:util";
import { formatUsage, textOf, thinkingOf } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";

const PROBLEM =
  "A deploy pipeline runs 4 minutes of unit tests, then 9 minutes of " +
  "integration tests, then a rollout in three stages 10 minutes apart. " +
  "The rollout aborts if canary error rate exceeds 0.5%. If a bad commit " +
  "lands at 14:00 and the canary trips at the second stage, what is the " +
  "earliest wall-clock time a rollback could complete, given a rollback " +
  "takes 90 seconds and someone must first notice the abort? State your " +
  "assumptions.";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { efforts: { type: "string", default: "low,high,max" } },
});

const client = createClient();

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

async function run(effort: Effort, display: "summarized" | undefined) {
  const started = Date.now();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    thinking: display ? { type: "adaptive", display } : { type: "adaptive" },
    // effort lives INSIDE output_config, not at the top level.
    output_config: { effort },
    messages: [{ role: "user", content: PROBLEM }],
  });
  const summaries = thinkingOf(response);

  console.log(`--- effort=${effort} display=${display ?? "(default)"} ---`);
  console.log(`  usage:    ${formatUsage(response.usage)}`);
  console.log(`  wall:     ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(`  thinking: ${summaries.length} summarised block(s)`);
  if (summaries[0]) console.log(`    ${summaries[0].slice(0, 180)}...`);
  console.log(`  answer:   ${textOf(response).trim().slice(0, 220)}...\n`);
  return response;
}

for (const effort of values.efforts!.split(",")) {
  await run(effort.trim() as Effort, "summarized");
}

// The surprise: display defaults to "omitted" on current models. The thinking
// blocks are there and billed; the text is empty.
console.log("--- the same request with `display` left at its default ---");
const defaulted = await client.messages.create({
  model: MODEL,
  max_tokens: 8000,
  thinking: { type: "adaptive" },
  output_config: { effort: "low" },
  messages: [{ role: "user", content: PROBLEM }],
});
const thinkingBlocks = defaulted.content.filter((block) => block.type === "thinking");
const nonEmpty = thinkingBlocks.filter((block) => block.thinking.trim().length > 0);
console.log(`  thinking blocks present: ${thinkingBlocks.length}`);
console.log(`  with readable text:      ${nonEmpty.length}`);
console.log(`  usage:                   ${formatUsage(defaulted.usage)}`);
console.log(
  "\n  The blocks are billed either way. A UI streaming thinking text\n" +
    "  without display='summarized' shows a long pause, not a bug.\n",
);

console.log(
  "effort controls reasoning depth and token spend. It is NOT a\n" +
    "temperature replacement - see lesson 6. And echo thinking blocks back\n" +
    "unchanged when you continue the conversation - see lesson 26.",
);
