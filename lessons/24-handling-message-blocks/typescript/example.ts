/**
 * Lesson 24 - Handling message blocks.
 *
 * The correction that matters most in the whole course: dispatch on block.type.
 * This sends a request that reliably produces a mixed response and walks it.
 *
 *   npm run lesson -- 24
 */
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";
import { TOOL_DEFINITIONS } from "../../../shared/typescript/tools.ts";

function describe(index: number, block: Anthropic.ContentBlock): void {
  switch (block.type) {
    case "thinking": {
      const summary = (block.thinking ?? "").trim();
      const shown = summary.length > 100 ? `${summary.slice(0, 100)}...` : summary;
      console.log(
        `  [${index}] thinking            ${shown || "(empty - display is omitted)"}`,
      );
      console.log("       -> echo this back unchanged in the next request");
      break;
    }
    case "redacted_thinking":
      console.log(`  [${index}] redacted_thinking   (opaque)`);
      console.log("       -> echo this back unchanged too");
      break;
    case "text":
      console.log(
        `  [${index}] text                ${JSON.stringify(block.text.slice(0, 100))}`,
      );
      console.log("       -> concatenate with the other text blocks");
      break;
    case "tool_use":
      console.log(
        `  [${index}] tool_use            ${block.name}(${JSON.stringify(block.input)})`,
      );
      console.log(`       -> execute it, return a tool_result with id ${block.id}`);
      break;
    case "server_tool_use":
      console.log(`  [${index}] server_tool_use     ${block.name}`);
      console.log("       -> nothing; Anthropic already ran it");
      break;
    default:
      // Every other member of the union. In a real switch you can force
      // exhaustiveness with `const _never: never = block` here.
      console.log(`  [${index}] ${block.type}`);
      console.log(
        "       -> a block type this example does not know; check block.type",
      );
  }
}

const client = createClient();

const response = await client.messages.create({
  model: MODEL,
  max_tokens: 2000,
  tools: TOOL_DEFINITIONS,
  // display defaults to "omitted" on current models: the thinking blocks are
  // there and billed, but their text is empty. Ask for a summary.
  thinking: { type: "adaptive", display: "summarized" },
  messages: [
    {
      role: "user",
      content:
        "Remind me to renew the SSO certificate a week from now. " +
        "Think it through before you act.",
    },
  ],
});

console.log(`stop_reason: ${response.stop_reason}`);
console.log(`${response.content.length} blocks\n`);
response.content.forEach((block, index) => describe(index, block));

console.log("\n--- what the Academy would have read ---");
const ACADEMY_INDEX = 1;
const atIndex = response.content[ACADEMY_INDEX];
if (atIndex) {
  console.log(`  response.content[${ACADEMY_INDEX}] is a ${atIndex.type} block`);
  if (atIndex.type !== "tool_use") {
    console.log(
      "  -> `.input` does not exist on it; TypeScript refuses to compile that",
    );
  }
} else {
  console.log(`  response.content[${ACADEMY_INDEX}] is undefined`);
}

const toolIndices = response.content
  .map((block, index) => (block.type === "tool_use" ? index : -1))
  .filter((index) => index >= 0);
console.log(
  `  the tool_use block(s) are actually at index [${toolIndices.join(", ")}]`,
);
console.log("\n  Never index. Filter on block.type.");
