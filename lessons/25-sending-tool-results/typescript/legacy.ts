/**
 * Lesson 25 - the Academy's positional access, preserved.
 *
 * LEGACY. `response.content[1]` is not reliably the tool call on a current
 * model: adaptive thinking frequently puts a `thinking` block at index 0 and
 * text at index 1.
 *
 * In TypeScript the Academy line does not even compile - `ContentBlock` is a
 * union and `.input` is not on every member. The `@ts-expect-error` below is
 * what it costs to keep this file in `npm run typecheck`; delete it to see the
 * real error.
 *
 *   npm run lesson -- 25 legacy
 */
import Anthropic from "@anthropic-ai/sdk";
import { MODEL } from "../../../shared/typescript/config.ts";
import { TOOL_DEFINITIONS } from "../../../shared/typescript/tools.ts";

const client = new Anthropic();

const response = await client.messages.create({
  model: MODEL,
  max_tokens: 1000,
  tools: TOOL_DEFINITIONS,
  messages: [{ role: "user", content: "What is the current UTC time?" }],
});

console.log("blocks:", response.content.map((block) => block.type).join(", "));
console.log();

const atIndex = response.content[1];
if (atIndex) {
  console.log(`response.content[1] is a ${atIndex.type} block`);
} else {
  console.log("response.content has fewer than two blocks - index 1 is undefined");
}

console.log();
try {
  // LEGACY: the two lines the Academy teaches.
  // @ts-expect-error - ContentBlock is a union; `.input`/`.id` are not on every member.
  const toolInput = response.content[1].input;
  // @ts-expect-error - same reason.
  const toolUseId = response.content[1].id;
  console.log(`got input=${JSON.stringify(toolInput)} id=${toolUseId}`);
  console.log("(this happened to work - the layout was favourable this run)");
} catch (error) {
  console.log(`${error instanceof Error ? error.constructor.name : "Error"}: ${error}`);
}

console.log(
  "\nEven when it works it is luck. See example.ts: filter on block.type.\n" +
    "The two @ts-expect-error lines above are the compiler telling you so.",
);
