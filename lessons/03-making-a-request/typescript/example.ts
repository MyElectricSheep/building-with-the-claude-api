/**
 * Lesson 3 - Making a request.
 *
 * The whole course rests on this one call. The 2026 correction is in how you
 * read the response: dispatch on block type, and check stop_reason before
 * trusting text.
 *
 *   npm run lesson -- 03
 *   npm run lesson -- 03 -- "Explain BM25 in two sentences"
 */
import { blockTypes, formatUsage, textOf } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";

const DEFAULT_PROMPT = "What is quantum computing? Answer in one sentence.";

const prompt = process.argv.slice(2).join(" ") || DEFAULT_PROMPT;
const client = createClient();

const response = await client.messages.create({
  model: MODEL,
  max_tokens: 1000,
  messages: [{ role: "user", content: prompt }],
});

// What actually came back. Run this once and you will never write
// response.content[0].text again.
console.log(`model:        ${response.model}`);
console.log(`stop_reason:  ${response.stop_reason}`);
console.log(`block types:  ${blockTypes(response).join(", ")}`);
console.log(`usage:        ${formatUsage(response.usage)}`);
console.log();

if (response.stop_reason === "max_tokens") {
  console.log("[truncated - raise max_tokens]");
} else if (response.stop_reason === "refusal") {
  console.log(`[refused: ${JSON.stringify(response.stop_details)}]`);
}

console.log(textOf(response));
