/**
 * Lesson 66 - Environment inspection.
 *
 * The same repair task, blind and inspecting. The blind agent plausibly
 * succeeds and actually does not; the inspecting agent finds out because the
 * test fails.
 *
 * The observation here is RUNNING THE CODE, not taking a screenshot. That is
 * the correction: the right observation depends on the environment.
 *
 *   npm run lesson -- 66
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type Anthropic from "@anthropic-ai/sdk";
import {
  appendAssistantTurn,
  textOf,
  toolUses,
} from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";
import { SandboxedEditor } from "../../../shared/typescript/editor.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SOURCE = join(REPO_ROOT, "assets", "data", "buggy-stats.mjs");
const TASK =
  "stats.mjs has failing checks. Fix it so every check passes. Use the editor tool.";

const EDITOR_TOOL = {
  type: "text_editor_20250728",
  name: "str_replace_based_edit_tool",
  max_characters: 10_000,
} as const;

const RUN_TOOL: Anthropic.Tool = {
  name: "run_checks",
  description:
    "Execute stats.mjs and return its output. This is the ONLY way to know " +
    "whether an edit worked.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },
};

function freshSandbox(name: string): { editor: SandboxedEditor; root: string } {
  const root = join(REPO_ROOT, "assets", "sandbox", name);
  rmSync(root, { recursive: true, force: true });
  const editor = new SandboxedEditor(root);
  copyFileSync(SOURCE, join(root, "stats.mjs"));
  return { editor, root };
}

/** Observe the environment: actually execute the file. */
function runChecks(root: string): string {
  try {
    return (
      execFileSync(process.execPath, ["stats.mjs"], {
        cwd: root,
        encoding: "utf8",
        timeout: 20_000,
      }).trim() || "(no output)"
    );
  } catch (error) {
    const shaped = error as { stdout?: string; stderr?: string };
    return `${shaped.stdout ?? ""}${shaped.stderr ?? ""}`.trim() || "FAILED TO RUN";
  }
}

const client = createClient();

async function runAgent(label: string, inspecting: boolean): Promise<string> {
  console.log(`=== ${label} ===`);
  const { editor, root } = freshSandbox(
    `lesson-66-${inspecting ? "inspect" : "blind"}`,
  );
  const tools = inspecting ? [EDITOR_TOOL, RUN_TOOL] : [EDITOR_TOOL];

  const system = inspecting
    ? "Fix the file. After every edit, run run_checks and keep going until it " +
      "reports PASS. Never claim success without a PASS from run_checks."
    : "Fix the file. When you believe it is correct, say so.";

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: TASK }];
  let stopped = false;
  for (let turn = 1; turn <= 10 && !stopped; turn += 1) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system,
      tools,
      messages,
    });
    appendAssistantTurn(messages, response);
    const calls = toolUses(response);
    if (calls.length === 0) {
      console.log(`  turn ${turn}: the agent stopped`);
      console.log(`  claim: ${textOf(response).trim().slice(0, 200)}`);
      stopped = true;
      break;
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const call of calls) {
      if (call.name === "run_checks") {
        const output = runChecks(root);
        console.log(`  turn ${turn}: run_checks -> ${output.slice(0, 90)}`);
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: output,
          is_error: !output.startsWith("PASS"),
        });
        continue;
      }
      const input = call.input as Record<string, unknown>;
      const outcome = editor.handle(input);
      console.log(
        `  turn ${turn}: ${input.command} -> ${outcome.isError ? "ERROR" : "ok"}`,
      );
      results.push({
        type: "tool_result",
        tool_use_id: call.id,
        content: outcome.content,
        is_error: outcome.isError,
      });
    }
    messages.push({ role: "user", content: results });
  }
  if (!stopped) console.log("  turn limit reached");

  // The ground truth, whatever the agent said.
  const verdict = runChecks(root);
  console.log(`  ACTUAL: ${verdict.split("\n")[0]}\n`);
  return verdict;
}

console.log(`task: ${TASK}\n`);
console.log("the file has two bugs: one obvious, one that only shows on empty input\n");

const blind = await runAgent("blind - no way to observe the result", false);
const inspecting = await runAgent(
  "inspecting - can run the code and read the output",
  true,
);

console.log("=== verdicts ===");
console.log(`  blind:      ${blind.split("\n")[0]}`);
console.log(`  inspecting: ${inspecting.split("\n")[0]}`);
console.log(
  "\nThe blind agent often succeeds - it did on this run if the line above\n" +
    `says PASS (${blind.startsWith("PASS") ? "it did" : "it did not"}). That is\n` +
    "not the point, and a lesson that needed it to fail would be a rigged one.\n\n" +
    "The point is that the blind agent CLAIMED success and had no way to know.\n" +
    "The only reason you know whether it was right is the ACTUAL line - which\n" +
    "this script computed by running the code itself, after the agent had\n" +
    "finished. In production nobody runs that line for you.\n\n" +
    "The inspecting agent saw FAIL, kept going, and stopped on evidence.\n" +
    "Same outcome, completely different epistemics.\n\n" +
    "And note WHAT the observation was: running the code. Reaching for a\n" +
    "screenshot when you could read the file back is a lossier, more\n" +
    "expensive loop, not a more sophisticated one.",
);
