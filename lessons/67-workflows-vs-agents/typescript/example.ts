/**
 * Lesson 67 - Workflows vs agents.
 *
 * Two halves: a decision function you can run over real tasks, and a measured
 * comparison of the same job done both ways.
 *
 *   npm run lesson -- 67
 *   npm run lesson -- 67 -- --decide-only
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type Anthropic from "@anthropic-ai/sdk";
import {
  appendAssistantTurn,
  textOf,
  toolUses,
} from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { FAST_MODEL } from "../../../shared/typescript/config.ts";
import { withinWordCount } from "../../../shared/typescript/graders.ts";
import { recommendTier } from "../../../shared/typescript/tiers.ts";
import type { TaskShape } from "../../../shared/typescript/tiers.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const NOTES = readFileSync(join(REPO_ROOT, "assets", "data", "incident.md"), "utf8");

const shape = (
  stepsAreKnowable: boolean,
  needsMultipleSteps: boolean,
  outcomeJustifiesCost: boolean,
  measuredViable: boolean,
  errorsAreRecoverable: boolean,
  needsHostedRuntime: boolean,
): TaskShape => ({
  stepsAreKnowable,
  needsMultipleSteps,
  outcomeJustifiesCost,
  measuredViable,
  errorsAreRecoverable,
  needsHostedRuntime,
});

const TASKS: [string, TaskShape][] = [
  [
    "Classify a support email into one of five categories",
    shape(true, false, true, true, true, false),
  ],
  [
    "Draft an incident retrospective from raw notes, then check it",
    shape(true, true, true, true, true, false),
  ],
  [
    "Route a message, then answer it with the right tools",
    shape(true, true, true, true, true, false),
  ],
  [
    "Debug a failing test in an unfamiliar repo",
    shape(false, true, true, true, true, false),
  ],
  [
    "Investigate a production incident across logs, metrics and traces overnight",
    shape(false, true, true, true, true, true),
  ],
  [
    "Reword a marketing headline more punchily",
    shape(false, true, false, true, true, false),
  ],
  [
    "Autonomously reconcile and post month-end journal entries",
    shape(false, true, true, true, false, false),
  ],
  [
    "Diagnose a rare hardware fault from sensor traces (never evaluated)",
    shape(false, true, true, false, true, false),
  ],
];

const SUMMARY_TOOLS: Anthropic.Tool[] = [
  {
    name: "read_notes",
    description: "Return the raw incident notes.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "check_draft",
    description:
      "Check a draft retrospective: returns whether it is within 120-400 words. " +
      "Call this before finishing.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { draft: { type: "string" } },
      required: ["draft"],
      additionalProperties: false,
    },
  },
];

const WRITE_SYSTEM =
  "Write a blameless incident retrospective. 120-400 words. Be specific about " +
  "times and causes.";

console.log("=== the decision, as a function ===\n");
const width = Math.max(...TASKS.map(([task]) => task.length));
for (const [task, taskShape] of TASKS) {
  const result = recommendTier(taskShape);
  const failed =
    result.failed.length > 0 ? `  (failed: ${result.failed.join(", ")})` : "";
  console.log(`${task.padEnd(width)}  ->  ${result.tier}${failed}`);
  console.log(`${"".padEnd(width)}      ${result.reason}\n`);
}

if (process.argv.includes("--decide-only")) {
  console.log("--decide-only: skipping the measured comparison.");
} else {
  const client = createClient();

  interface Run {
    draft: string;
    tokens: number;
    turns: number;
    seconds: number;
  }

  /** The sequence is known, so just do it: write, then check, then revise once. */
  async function asWorkflow(): Promise<Run> {
    const started = Date.now();
    let tokens = 0;

    let response = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 1200,
      system: WRITE_SYSTEM,
      messages: [{ role: "user", content: `<notes>\n${NOTES}\n</notes>` }],
    });
    tokens += response.usage.input_tokens + response.usage.output_tokens;
    let draft = textOf(response).trim();
    let turns = 1;

    const gate = withinWordCount(120, 400)(draft);
    if (gate.score < 1) {
      response = await client.messages.create({
        model: FAST_MODEL,
        max_tokens: 1200,
        system: WRITE_SYSTEM,
        messages: [
          { role: "user", content: `<notes>\n${NOTES}\n</notes>` },
          { role: "assistant", content: draft },
          { role: "user", content: `Revise: ${gate.reason}.` },
        ],
      });
      tokens += response.usage.input_tokens + response.usage.output_tokens;
      draft = textOf(response).trim();
      turns += 1;
    }

    return { draft, tokens, turns, seconds: (Date.now() - started) / 1000 };
  }

  /** The same job, with the sequence left to the model. */
  async function asAgent(): Promise<Run> {
    const started = Date.now();
    let tokens = 0;
    let turns = 0;
    let draft = "";
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content:
          "Write a blameless incident retrospective from the notes. Use the " +
          "tools. Check the draft before you finish.",
      },
    ];

    for (let attempt = 0; attempt < 10; attempt += 1) {
      turns += 1;
      const response = await client.messages.create({
        model: FAST_MODEL,
        max_tokens: 1500,
        system: WRITE_SYSTEM,
        tools: SUMMARY_TOOLS,
        messages,
      });
      tokens += response.usage.input_tokens + response.usage.output_tokens;
      appendAssistantTurn(messages, response);

      const calls = toolUses(response);
      if (calls.length === 0) {
        draft = textOf(response).trim() || draft;
        break;
      }

      const results: Anthropic.ToolResultBlockParam[] = calls.map((call) => {
        if (call.name === "read_notes") {
          return { type: "tool_result", tool_use_id: call.id, content: NOTES };
        }
        draft = String((call.input as { draft?: string }).draft ?? "").trim();
        const gate = withinWordCount(120, 400)(draft);
        return {
          type: "tool_result",
          tool_use_id: call.id,
          content: JSON.stringify({ ok: gate.score >= 1, detail: gate.reason }),
        };
      });
      messages.push({ role: "user", content: results });
    }

    return { draft, tokens, turns, seconds: (Date.now() - started) / 1000 };
  }

  console.log("=== the same job, both ways ===\n");
  const workflow = await asWorkflow();
  const agent = await asAgent();

  const header =
    "".padEnd(12) +
    "tokens".padStart(8) +
    "turns".padStart(7) +
    "seconds".padStart(9) +
    "passes gate".padStart(13);
  console.log(header);
  console.log("-".repeat(header.length));
  for (const [label, run] of [
    ["workflow", workflow],
    ["agent", agent],
  ] as const) {
    const passes = withinWordCount(120, 400)(run.draft).score >= 1;
    console.log(
      label.padEnd(12) +
        String(run.tokens).padStart(8) +
        String(run.turns).padStart(7) +
        run.seconds.toFixed(1).padStart(9) +
        String(passes).padStart(13),
    );
  }

  console.log(
    "\nThe agent usually gets there. The numbers answer a different question:\n" +
      "what it cost to get there the flexible way, on a task whose sequence was\n" +
      "knowable all along.\n\n" +
      "Agents got much easier to build - tool runner, Agent SDK, Managed Agents.\n" +
      "That is exactly why the discipline matters more: the cost of building one\n" +
      "used to be the filter, and now judgement has to be.",
  );
}
