/**
 * Lesson 27 - Implementing multiple turns.
 *
 * The same request, twice: once through the hand-written loop, once through the
 * SDK tool runner. Read the manual loop; use the runner.
 *
 *   npm run lesson -- 27
 *   npm run lesson -- 27 -- --manual
 *   npm run lesson -- 27 -- --runner
 */
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import {
  appendAssistantTurn,
  textOf,
  toolUses,
} from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";
import {
  DURATION_UNITS,
  ReminderStore,
  TOOL_DEFINITIONS,
  addDurationToDatetime,
  executeTool,
  getCurrentDatetime,
} from "../../../shared/typescript/tools.ts";

const REQUEST = "Remind me to renew the SSO certificate a week from now.";
const MAX_TURNS = 8;

const client = createClient();

// ---------------------------------------------------------------------------
// 1. The manual loop. This is the protocol.
// ---------------------------------------------------------------------------

async function manualLoop(): Promise<string> {
  const store = new ReminderStore();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: REQUEST }];

  // A bounded loop. `while (true)` around a paid API call is a bug waiting for
  // a model that keeps calling tools.
  for (let turn = 1; turn <= MAX_TURNS; turn += 1) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      tools: TOOL_DEFINITIONS,
      messages,
    });

    // A long-running SERVER tool can pause the turn. Append and re-send.
    if (response.stop_reason === "pause_turn") {
      console.log(`  turn ${turn}: pause_turn - resuming`);
      appendAssistantTurn(messages, response);
      continue;
    }

    appendAssistantTurn(messages, response);
    const calls = toolUses(response);
    if (calls.length === 0) {
      console.log(`  turn ${turn}: end_turn`);
      return textOf(response);
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const call of calls) {
      console.log(`  turn ${turn}: ${call.name}(${JSON.stringify(call.input)})`);
      try {
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: JSON.stringify(executeTool(call.name, call.input, store)),
        });
      } catch (error) {
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: error instanceof Error ? error.message : String(error),
          is_error: true,
        });
      }
    }
    messages.push({ role: "user", content: results });
  }

  throw new Error(`tool loop did not finish within ${MAX_TURNS} turns`);
}

// ---------------------------------------------------------------------------
// 2. The tool runner. Same protocol, the SDK drives it.
//    betaZodTool takes a Zod schema, so `input` is typed inside run().
// ---------------------------------------------------------------------------

const runnerStore = new ReminderStore();

const currentDatetime = betaZodTool({
  name: "current_datetime",
  description:
    "Return the current date and time in UTC, ISO 8601. Call this before any " +
    "relative date arithmetic - never guess the time.",
  inputSchema: z.object({}),
  run: () => getCurrentDatetime(),
});

const shiftDatetime = betaZodTool({
  name: "shift_datetime",
  description: "Shift an ISO 8601 UTC datetime by a signed amount.",
  inputSchema: z.object({
    datetime: z.string().describe("ISO 8601 UTC instant, e.g. 2026-09-09T13:00:00Z"),
    amount: z.number().describe("May be negative to go backwards."),
    unit: z.enum(DURATION_UNITS),
  }),
  run: ({ datetime, amount, unit }) => addDurationToDatetime(datetime, amount, unit),
});

const createReminder = betaZodTool({
  name: "create_reminder",
  description: "Create a reminder at a known UTC instant.",
  inputSchema: z.object({
    text: z.string().describe("What to remind the user about."),
    remind_at: z.string().describe("ISO 8601 UTC instant."),
  }),
  run: ({ text, remind_at }) =>
    JSON.stringify(runnerStore.setReminder(text, remind_at)),
});

async function runnerLoop(): Promise<string> {
  const runner = client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 1500,
    tools: [currentDatetime, shiftDatetime, createReminder],
    messages: [{ role: "user", content: REQUEST }],
    max_iterations: MAX_TURNS,
  });

  let turn = 0;
  let last: Anthropic.Beta.BetaMessage | undefined;
  for await (const message of runner) {
    turn += 1;
    const names = message.content
      .filter((block) => block.type === "tool_use")
      .map((block) => block.name);
    console.log(`  turn ${turn}: ${message.stop_reason} [${names.join(", ")}]`);
    last = message;
  }

  if (!last) throw new Error("the runner produced no messages");
  // The runner does NOT auto-resume pause_turn: it exits and hands you a
  // silently truncated answer. Always check. (In TypeScript you can recover
  // with runner.pushMessages({role: "assistant", content: last.content}).)
  if (last.stop_reason === "pause_turn") {
    throw new Error("runner stopped on pause_turn - resume with pushMessages()");
  }
  return last.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

const onlyManual = process.argv.includes("--manual");
const onlyRunner = process.argv.includes("--runner");

if (!onlyRunner) {
  console.log("=== manual loop ===");
  console.log(`\n${await manualLoop()}\n`);
}

if (!onlyManual) {
  console.log("=== tool runner ===");
  console.log(`\n${await runnerLoop()}`);
  console.log(
    `\nreminders created by the runner: ${JSON.stringify(runnerStore.list())}`,
  );
}
