/**
 * Lesson 21 - Project overview.
 *
 * The three reminder tools as the API sees them, then one end-to-end request so
 * you can watch them chain.
 *
 *   npm run lesson -- 21
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

const REQUEST = "Remind me to renew the SSO certificate a week from now.";

console.log("=== the three tools, as the API sees them ===\n");
for (const tool of TOOL_DEFINITIONS) {
  console.log(tool.name);
  console.log(`  ${tool.description}`);
  console.log(`  strict: ${tool.strict}`);
  console.log(`  schema: ${JSON.stringify(tool.input_schema)}\n`);
}

console.log("Exactly one of these mutates state: set_reminder. It is the only one");
console.log("that needs idempotency and authorisation - strict does not help there.\n");

const client = createClient();
const store = new ReminderStore();
const messages: Anthropic.MessageParam[] = [{ role: "user", content: REQUEST }];

console.log(`=== one request: ${JSON.stringify(REQUEST)} ===\n`);

let finished = false;
for (let turn = 1; turn <= 8 && !finished; turn += 1) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    tools: TOOL_DEFINITIONS,
    messages,
  });
  appendAssistantTurn(messages, response);

  const calls = toolUses(response);
  if (calls.length === 0) {
    console.log(`turn ${turn}: done`);
    console.log(`\n${textOf(response)}`);
    finished = true;
    break;
  }

  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const call of calls) {
    console.log(`turn ${turn}: ${call.name}(${JSON.stringify(call.input)})`);
    try {
      const value = executeTool(call.name, call.input, store);
      results.push({
        type: "tool_result",
        tool_use_id: call.id,
        content: JSON.stringify(value),
      });
      console.log(`         -> ${JSON.stringify(value)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        type: "tool_result",
        tool_use_id: call.id,
        content: message,
        is_error: true,
      });
      console.log(`         -> ERROR ${message}`);
    }
  }
  messages.push({ role: "user", content: results });
}

if (!finished) console.log("turn limit reached");
console.log(`\nreminders created: ${JSON.stringify(store.list())}`);
