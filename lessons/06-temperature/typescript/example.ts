/**
 * Lesson 6 - Temperature, replaced by prompting.
 *
 * There is no randomness parameter any more. Steer with instructions, and get
 * diversity by issuing independent requests.
 *
 *   npm run lesson -- 06
 */
import { textOf } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";

const QUESTION = "Suggest a name for a command-line tool that formats SQL migrations.";

// The replacement for temperature=0.1
const CONSERVATIVE =
  "Respond conservatively. Prioritise the most likely, well-supported answer. " +
  "Avoid creative speculation. Give exactly one suggestion and one sentence of " +
  "justification.";

// The replacement for temperature=1.0
const EXPLORATORY =
  "Generate five substantially different possibilities. Explore unusual " +
  "approaches and avoid converging on the most obvious answer. One line each, " +
  "no justification.";

const client = createClient();

for (const [label, system] of [
  ["conservative", CONSERVATIVE],
  ["exploratory", EXPLORATORY],
] as const) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system,
    messages: [{ role: "user", content: QUESTION }],
  });
  console.log(`--- steered by prompt: ${label} ---`);
  console.log(textOf(response));
  console.log();
}

// Sampling diversity, without a sampling parameter: independent requests to the
// same prompt do not return identical text.
console.log("--- three independent requests, same prompt ---");
for (let index = 0; index < 3; index += 1) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 60,
    system: "Answer with a single name and nothing else.",
    messages: [{ role: "user", content: QUESTION }],
  });
  console.log(`  ${index + 1}. ${textOf(response).trim()}`);
}

console.log(
  "\nNote: output_config.effort is NOT the replacement for temperature. " +
    "It controls reasoning depth, not randomness.",
);
