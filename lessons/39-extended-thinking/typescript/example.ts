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

// Adaptive thinking DECIDES whether to think. An easy question gets no
// thinking blocks at all - which is the feature working, not a failure. This
// problem is hard enough to reliably trigger it.
const PROBLEM =
  "A 3x3 grid holds each of the numbers 1-9 exactly once. Every row sums to " +
  "15 and both diagonals sum to 15. The centre cell is not 5. Either produce " +
  "such a grid or prove none exists. Reason carefully and show the argument.";

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

  const blocks = response.content.filter((block) => block.type === "thinking");
  console.log(`--- effort=${effort} display=${display ?? "(default)"} ---`);
  console.log(`  usage:    ${formatUsage(response.usage)}`);
  console.log(`  wall:     ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(
    `  thinking: ${blocks.length} block(s), ${summaries.length} with readable text`,
  );
  if (summaries[0]) {
    console.log(`    ${summaries[0].slice(0, 180)}...`);
  } else if (blocks.length === 0) {
    // Not a failure: adaptive thinking decided this did not need it.
    console.log("    (adaptive thinking chose not to think - that is the feature)");
  }
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
  thinkingBlocks.length > 0 && nonEmpty.length === 0
    ? "\n  There it is: the block is present and billed, and its text is\n" +
        "  empty. A UI streaming thinking text without display='summarized'\n" +
        "  shows a long pause, not a bug.\n"
    : "\n  (No thinking blocks this run - adaptive thinking decided the\n" +
        "  question did not need it. Re-run, or raise --efforts.)\n",
);

console.log(
  "effort controls reasoning depth and token spend. It is NOT a\n" +
    "temperature replacement - see lesson 6. And echo thinking blocks back\n" +
    "unchanged when you continue the conversation - see lesson 26.",
);
