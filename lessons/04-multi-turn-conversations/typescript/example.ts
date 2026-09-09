/**
 * Lesson 4 - Multi-turn conversations.
 *
 * The API is stateless: memory is just the history you resend. The 2026 upgrade
 * is to append the whole assistant turn, not the extracted string.
 *
 *   npm run lesson -- 04
 */
import type Anthropic from "@anthropic-ai/sdk";
import { appendAssistantTurn, textOf } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";

const TURNS = [
  "My name is Priya and I am learning the Claude API.",
  "I am building a search feature over a documentation site.",
  "What is my name, and what am I building?",
];

const client = createClient();
// Use the SDK's own type rather than declaring a ChatMessage interface.
const messages: Anthropic.MessageParam[] = [];

for (const turn of TURNS) {
  messages.push({ role: "user", content: turn });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages,
  });

  // Preserve every block. Appending only textOf(response) would drop thinking
  // blocks now, and tool_use blocks in lesson 25 onward.
  appendAssistantTurn(messages, response);

  console.log(`user      > ${turn}`);
  console.log(`assistant > ${textOf(response)}\n`);
}

console.log(`History sent on the final request: ${messages.length} turns.`);
console.log("Nothing is stored server-side; that list is the entire memory.");
