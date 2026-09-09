/**
 * Lesson 20 - Introducing tool use.
 *
 * One tool, one call, one result, one follow-up: the smallest complete round
 * trip. Then the same request with a SERVER tool, so the difference is concrete.
 *
 *   npm run lesson -- 20
 */
import type Anthropic from "@anthropic-ai/sdk";
import { blockTypes, textOf, toolUses } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";
import { ReminderStore, executeTool } from "../../../shared/typescript/tools.ts";

const CLOCK_TOOL: Anthropic.Tool = {
  name: "get_current_datetime",
  description: "Return the current date and time in UTC, ISO 8601.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },
};

const client = createClient();

console.log("=== client tool: YOU execute it, YOU return a tool_result ===\n");
const messages: Anthropic.MessageParam[] = [
  { role: "user", content: "What time is it in UTC right now?" },
];

// 1. Claude decides it needs the tool.
const first = await client.messages.create({
  model: MODEL,
  max_tokens: 500,
  tools: [CLOCK_TOOL],
  messages,
});
console.log(`stop_reason: ${first.stop_reason}`);
console.log(`blocks:      ${blockTypes(first).join(", ")}`);

const calls = toolUses(first);
if (calls.length === 0) {
  console.log("Claude answered without the tool:");
  console.log(textOf(first));
} else {
  const call = calls[0]!;
  console.log(
    `tool call:   ${call.name}(${JSON.stringify(call.input)}) id=${call.id}\n`,
  );

  // 2. YOU run it. Claude never executed anything.
  const result = executeTool(call.name, call.input, new ReminderStore());
  console.log(`you ran it:  ${JSON.stringify(result)}\n`);

  // 3. Send the result back. The assistant turn must be preserved whole, and
  //    the tool_result must carry the matching tool_use_id.
  messages.push({ role: "assistant", content: first.content });
  messages.push({
    role: "user",
    content: [
      {
        type: "tool_result",
        tool_use_id: call.id,
        content: JSON.stringify(result),
      },
    ],
  });

  const second = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    tools: [CLOCK_TOOL],
    messages,
  });
  console.log(`stop_reason: ${second.stop_reason}`);
  console.log(`answer:      ${textOf(second)}`);
}

console.log(
  "\n\n=== server tool: ANTHROPIC executes it, no tool_result from you ===\n",
);
const searched = await client.messages.create({
  model: MODEL,
  max_tokens: 1500,
  // A server tool. Note there is no function to implement, and no annotation:
  // `Anthropic.Tool` is the custom-tool variant only.
  tools: [{ type: "web_search_20260318", name: "web_search", max_uses: 1 }],
  messages: [
    {
      role: "user",
      content: "In one sentence: what is the Model Context Protocol?",
    },
  ],
});
console.log(`stop_reason: ${searched.stop_reason}`);
console.log(`blocks:      ${blockTypes(searched).join(", ")}`);
console.log(
  "\nNotice there is no `tool_use` block for you to answer. The search ran\n" +
    "server-side and its results are already in the response. Writing a\n" +
    "tool_result for a server tool is a validation error.",
);
console.log(`\nanswer: ${textOf(searched).slice(0, 400)}`);
