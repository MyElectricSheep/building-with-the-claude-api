/**
 * Lesson 46 - the Academy's tool version and result parsing, preserved.
 *
 * LEGACY. Two separate problems:
 *
 *   1. `code_execution_20250522` is the legacy Python-only version.
 *   2. The result parsing looks for a bare `code_execution_output` block, which
 *      current versions do not return. That check silently matches nothing -
 *      the code does not error, it just finds no output.
 *
 * This runs the legacy tool version if the API still accepts it, and shows BOTH
 * parsers side by side against the same response.
 *
 *   npm run lesson -- 46 legacy
 */
import Anthropic from "@anthropic-ai/sdk";
import { MODEL } from "../../../shared/typescript/config.ts";

const client = new Anthropic();

const LEGACY_TOOL = {
  type: "code_execution_20250522",
  name: "code_execution",
} as unknown as Anthropic.Messages.ToolUnion;

console.log(`Requesting code_execution_20250522 on ${MODEL}...\n`);

let response: Anthropic.Message;
try {
  response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    tools: [LEGACY_TOOL],
    messages: [
      { role: "user", content: "Compute the mean and standard deviation of 1..10." },
    ],
  });
} catch (error) {
  if (error instanceof Anthropic.BadRequestError) {
    console.log(`400 from the API: ${error.message}`);
    console.log("\nUse code_execution_20260521 - see example.ts.");
    process.exit(0);
  }
  throw error;
}

console.log("blocks:", response.content.map((block) => block.type).join(", "));
console.log();

// LEGACY parser: looks for a block type current versions do not emit. It is not
// in the ContentBlock union any more, hence the cast.
const legacyHits = response.content.filter(
  (block) => (block.type as string) === "code_execution_output",
);
console.log(
  `legacy parser  (code_execution_output):          ${legacyHits.length} block(s)`,
);

// CURRENT parser.
const currentHits = response.content.filter(
  (block) => block.type === "bash_code_execution_tool_result",
);
console.log(
  `current parser (bash_code_execution_tool_result): ${currentHits.length} block(s)`,
);

for (const block of currentHits) {
  if (block.content.type === "bash_code_execution_result") {
    console.log(`\nstdout:\n${block.content.stdout.trimEnd()}`);
  }
}

console.log(
  "\nThe legacy parser does not throw. It finds nothing, and a program built\n" +
    "on it silently reports no output. That is the failure mode to watch for.",
);
