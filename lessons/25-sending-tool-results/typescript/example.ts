/**
 * Lesson 25 - Sending tool results.
 *
 * The correct round trip: find the call by type, preserve the whole assistant
 * turn, match tool_use_id, batch every result into ONE user message - and return
 * an error result rather than dropping it.
 *
 *   npm run lesson -- 25
 */
import type Anthropic from "@anthropic-ai/sdk";
import {
  appendAssistantTurn,
  blockTypes,
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

/** Build one tool_result per tool_use block. Never skip a failing call. */
function resultsFor(
  response: Anthropic.Message,
  store: ReminderStore,
  forceError: boolean,
): Anthropic.ToolResultBlockParam[] {
  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const call of toolUses(response)) {
    try {
      if (forceError && call.name === "get_current_datetime") {
        throw new Error("clock service unavailable (simulated)");
      }
      const value = executeTool(call.name, call.input, store);
      results.push({
        type: "tool_result",
        tool_use_id: call.id, // the ID, not the index, not the name
        content: JSON.stringify(value),
      });
      console.log(`    ${call.name} -> ${JSON.stringify(value)}`);
    } catch (error) {
      // An unanswered tool_use makes the next request invalid. Always return
      // something, marked as an error the model can act on.
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        type: "tool_result",
        tool_use_id: call.id,
        content: message,
        is_error: true,
      });
      console.log(`    ${call.name} -> ERROR ${message}`);
    }
  }
  return results;
}

const client = createClient();
const store = new ReminderStore();
const messages: Anthropic.MessageParam[] = [
  { role: "user", content: "What is the current UTC time?" },
];

// Turn 1: force the clock tool to fail, so you can watch the recovery.
let response = await client.messages.create({
  model: MODEL,
  max_tokens: 1000,
  tools: TOOL_DEFINITIONS,
  messages,
});
console.log(`turn 1 blocks: ${blockTypes(response).join(", ")}`);

// Preserve the WHOLE assistant turn. Extracting only the text would drop the
// tool_use block that the tool_result answers, and the request would fail.
appendAssistantTurn(messages, response);

let results = resultsFor(response, store, true);
if (results.length > 0) {
  // All results in ONE user message. Splitting them across several messages
  // trains the model to stop making parallel calls.
  messages.push({ role: "user", content: results });
}

// Turn 2: the model sees is_error and tries again.
response = await client.messages.create({
  model: MODEL,
  max_tokens: 1000,
  tools: TOOL_DEFINITIONS,
  messages,
});
console.log(`turn 2 blocks: ${blockTypes(response).join(", ")}`);
appendAssistantTurn(messages, response);

results = resultsFor(response, store, false);
if (results.length > 0) {
  messages.push({ role: "user", content: results });
  response = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    tools: TOOL_DEFINITIONS,
    messages,
  });
  console.log(`turn 3 blocks: ${blockTypes(response).join(", ")}`);
}

console.log(`\nanswer: ${textOf(response)}`);
console.log(
  "\nNote how the error result kept the conversation valid. Dropping it\n" +
    "would have left an unanswered tool_use and the next request would 400.",
);
