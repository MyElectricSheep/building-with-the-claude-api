/**
 * Lesson 28 - Using multiple tools, and the parallelism the Academy predates.
 *
 * Three independent lookups in one turn. Execute them concurrently, return every
 * result in ONE user message, then compare with disable_parallel_tool_use.
 *
 *   npm run lesson -- 28
 */
import type Anthropic from "@anthropic-ai/sdk";
import {
  appendAssistantTurn,
  textOf,
  toolUses,
} from "../../../shared/typescript/blocks.ts";
import { CITY_TOOL, lookupCity } from "../../../shared/typescript/cities.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";

const REQUEST =
  "Compare Lisbon, Reykjavik and Noumea: give the timezone and population of " +
  "each, then say which is largest.";

const client = createClient();

/** Execute one tool_use block. Errors become is_error results, never drops. */
async function runCall(
  call: Anthropic.ToolUseBlock,
): Promise<Anthropic.ToolResultBlockParam> {
  try {
    const { city } = call.input as { city: string };
    return {
      type: "tool_result",
      tool_use_id: call.id,
      content: JSON.stringify(lookupCity(city)),
    };
  } catch (error) {
    return {
      type: "tool_result",
      tool_use_id: call.id,
      content: error instanceof Error ? error.message : String(error),
      is_error: true,
    };
  }
}

async function conversation(
  parallel: boolean,
): Promise<{ turns: number; widest: number; answer: string }> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: REQUEST }];
  let turns = 0;
  let widest = 0;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    turns += 1;
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      tools: [CITY_TOOL],
      messages,
      ...(parallel
        ? {}
        : { tool_choice: { type: "auto", disable_parallel_tool_use: true } as const }),
    });
    appendAssistantTurn(messages, response);

    const calls = toolUses(response);
    if (calls.length === 0) {
      return { turns, widest, answer: textOf(response) };
    }

    widest = Math.max(widest, calls.length);
    const names = calls
      .map((call) => String((call.input as { city?: string }).city))
      .join(", ");
    console.log(
      `  turn ${turns}: ${calls.length} tool call(s) in ONE assistant turn: ${names}`,
    );

    // They are independent - that is why the model batched them. Run them
    // concurrently.
    const results = await Promise.all(calls.map(runCall));

    // ALL results in ONE user message. Splitting them across several messages
    // trains the model to stop batching.
    messages.push({ role: "user", content: results });
  }

  throw new Error("turn limit reached");
}

console.log("=== parallel tool calls (the default) ===");
const parallelRun = await conversation(true);
console.log(`\n${parallelRun.answer}\n`);
console.log(
  `turns: ${parallelRun.turns} | most calls in a single turn: ${parallelRun.widest}\n`,
);

console.log("=== disable_parallel_tool_use: true ===");
const serialRun = await conversation(false);
console.log(
  `\nturns: ${serialRun.turns} | most calls in a single turn: ${serialRun.widest}`,
);

console.log(
  "\nParallel calls cost fewer round trips for the same work. Beyond a few\n" +
    "dozen tools, look at tool search (defer_loading); for tool-heavy chains,\n" +
    "look at programmatic tool calling. Both are in the README.",
);
