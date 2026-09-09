/**
 * Lesson 26 - Multi-turn conversations with tools.
 *
 * Tool calls and ordinary turns interleave. The 2026 fixes: no `temperature`,
 * and preserve every block of every assistant turn - thinking included.
 *
 *   npm run lesson -- 26
 */
import type Anthropic from "@anthropic-ai/sdk";
import {
  appendAssistantTurn,
  textOf,
  toolUses,
} from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";
import {
  ReminderStore,
  TOOL_DEFINITIONS,
  executeTool,
} from "../../../shared/typescript/tools.ts";

const TURNS = [
  "Remind me to renew the SSO certificate a week from now.",
  "Actually, make that two days earlier.",
  "What did I ask you to remind me about, and when?",
];

const client = createClient();
const store = new ReminderStore();
const messages: Anthropic.MessageParam[] = [];

/** Drive tool calls until the model produces a final answer for this turn. */
async function runTurn(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      tools: TOOL_DEFINITIONS,
      // No `temperature` - the Academy helper's default breaks here.
      messages,
    });
    // Every block, unchanged. A tool_result is invalid without its tool_use,
    // and thinking blocks carry reasoning state into the next turn.
    appendAssistantTurn(messages, response);

    const calls = toolUses(response);
    if (calls.length === 0) return textOf(response);

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const call of calls) {
      try {
        const value = executeTool(call.name, call.input, store);
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: JSON.stringify(value),
        });
        console.log(`    [tool] ${call.name} -> ${JSON.stringify(value)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: message,
          is_error: true,
        });
        console.log(`    [tool] ${call.name} -> ERROR ${message}`);
      }
    }
    messages.push({ role: "user", content: results });
  }
  throw new Error("turn limit reached");
}

for (const turn of TURNS) {
  console.log(`user      > ${turn}`);
  messages.push({ role: "user", content: turn });
  console.log(`assistant > ${await runTurn()}\n`);
}

console.log("=== accumulated history ===");
messages.forEach((message, index) => {
  const shape =
    typeof message.content === "string"
      ? "text"
      : message.content.map((block) => block.type).join(", ");
  console.log(`  [${index}] ${message.role.padEnd(9)} ${shape}`);
});

const thinkingBlocks = messages
  .flatMap((message) => (typeof message.content === "string" ? [] : message.content))
  .filter(
    (block) => block.type === "thinking" || block.type === "redacted_thinking",
  ).length;

console.log(`\n${thinkingBlocks} thinking block(s) preserved across the conversation.`);
console.log(
  "Appending textOf(response) instead of response.content would have\n" +
    "dropped all of them - and every tool_use block with them, which would\n" +
    "have made the tool_result messages invalid.",
);
console.log(`\nreminders: ${JSON.stringify(store.list())}`);
