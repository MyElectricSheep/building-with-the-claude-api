/**
 * Lesson 30 - The text editor tool.
 *
 * Current version and name: text_editor_20250728 / str_replace_based_edit_tool.
 * `undo_edit` was removed. Everything runs against a sandbox under assets/.
 *
 *   npm run lesson -- 30
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
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
const SANDBOX = join(REPO_ROOT, "assets", "sandbox", "lesson-30");

const BUGGY_SOURCE = `"""Prime helpers."""


def is_prime(n):
    if n < 2:
        return False
    for divisor in range(2, int(n ** 0.5) + 1)
        if n % divisor == 0:
            return False
    return True


def primes_up_to(limit):
    return [n for n in range(limit + 1) if is_prime(n)]
`;

// The Anthropic-defined text editor tool. Schema-less: no input_schema.
// The type/name pair must match, and max_characters needs 20250728 or later.
const EDITOR_TOOL = {
  type: "text_editor_20250728",
  name: "str_replace_based_edit_tool",
  max_characters: 10_000,
} as const;

rmSync(SANDBOX, { recursive: true, force: true });
const editor = new SandboxedEditor(SANDBOX);
mkdirSync(SANDBOX, { recursive: true });
writeFileSync(join(SANDBOX, "primes.py"), BUGGY_SOURCE, "utf8");

console.log(`sandbox: ${relative(REPO_ROOT, SANDBOX)}`);
console.log("primes.py has a syntax error on line 7 (a missing colon).\n");

const client = createClient();
const messages: Anthropic.MessageParam[] = [
  {
    role: "user",
    content:
      "There is a syntax error in primes.py that stops it running. " +
      "View the file, fix it, and tell me what you changed.",
  },
];

let finished = false;
for (let turn = 1; turn <= 8 && !finished; turn += 1) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    tools: [EDITOR_TOOL],
    messages,
  });
  appendAssistantTurn(messages, response);

  const calls = toolUses(response);
  if (calls.length === 0) {
    console.log(`\nturn ${turn}: done\n`);
    console.log(textOf(response));
    finished = true;
    break;
  }

  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const call of calls) {
    const input = call.input as Record<string, unknown>;
    console.log(`turn ${turn}: ${input.command} ${input.path}`);
    const result = editor.handle(input);
    const marker = result.isError ? "ERROR" : "ok";
    console.log(
      `         -> ${marker}: ${result.content.split("\n")[0]?.slice(0, 80)}`,
    );
    results.push({
      type: "tool_result",
      tool_use_id: call.id,
      content: result.content,
      is_error: result.isError,
    });
  }
  messages.push({ role: "user", content: results });
}

if (!finished) console.log("turn limit reached");

console.log("\n--- the file now ---");
console.log(readFileSync(join(SANDBOX, "primes.py"), "utf8"));

console.log("--- what a model attempting undo_edit would get back ---");
const refusal = editor.handle({ command: "undo_edit", path: "primes.py" });
console.log(`isError=${refusal.isError}: ${refusal.content}`);
console.log(
  "\nundo_edit was removed in text_editor_20250429. A backup file was\n" +
    "written before the edit instead - that is now your undo.",
);
