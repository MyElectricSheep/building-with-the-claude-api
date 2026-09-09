/**
 * Lesson 46 - Code execution and the Files API.
 *
 * Current tool version, correct result-block parsing, safe file download, and
 * container reuse.
 *
 *   npm run lesson -- 46
 */
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type Anthropic from "@anthropic-ai/sdk";
import { toFile } from "@anthropic-ai/sdk";
import { blockTypes, textOf } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CSV_PATH = join(REPO_ROOT, "assets", "data", "deploys.csv");
const OUTPUT_DIR = join(REPO_ROOT, "outputs", "lesson-46");

// Current latest. 20250522 is the legacy Python-only version; 20260120 is still
// current if you want programmatic tool calling.
const CODE_EXECUTION = {
  type: "code_execution_20260521",
  name: "code_execution",
} as const;

const client = createClient();

/**
 * Walk the response with the CURRENT block types. A bare
 * `code_execution_output` block is not what current versions return.
 */
function describeResults(response: Anthropic.Message): void {
  for (const block of response.content) {
    if (block.type === "server_tool_use") {
      console.log(`  [running] ${block.name}`);
    } else if (block.type === "bash_code_execution_tool_result") {
      const result = block.content;
      // An error arrives as content being an error object, not a result.
      if (result.type !== "bash_code_execution_result") {
        console.log(`  [tool error] ${result.error_code ?? result.type}`);
        continue;
      }
      console.log(`  [exit ${result.return_code}]`);
      if (result.stdout) {
        for (const line of result.stdout.trimEnd().split("\n").slice(0, 12)) {
          console.log(`    ${line}`);
        }
      }
      if (result.stderr) {
        console.log(`    stderr: ${result.stderr.trimEnd().slice(0, 200)}`);
      }
    } else if (block.type === "text_editor_code_execution_tool_result") {
      console.log(`  [file op] ${JSON.stringify(block.content)}`);
    }
  }
}

async function downloadOutputs(response: Anthropic.Message): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const block of response.content) {
    if (block.type !== "bash_code_execution_tool_result") continue;
    const result = block.content;
    if (result.type !== "bash_code_execution_result" || !result.content) continue;
    for (const reference of result.content) {
      if (reference.type !== "bash_code_execution_output") continue;
      const metadata = await client.files.retrieveMetadata(reference.file_id);
      // The filename comes from the sandbox. Sanitise it before writing:
      // otherwise a generated name is a path traversal in YOUR process.
      const safeName = basename(metadata.filename);
      if (!safeName || safeName === "." || safeName === "..") {
        console.log(`  [skipped] unsafe filename ${JSON.stringify(metadata.filename)}`);
        continue;
      }
      const download = await client.files.download(reference.file_id);
      const bytes = Buffer.from(await download.arrayBuffer());
      const destination = join(OUTPUT_DIR, safeName);
      writeFileSync(destination, bytes);
      console.log(`  [saved] ${relative(REPO_ROOT, destination)}`);
    }
  }
}

// Upload the input. Note the block type below: container_upload, NOT document.
const uploaded = await client.files.upload({
  file: await toFile(createReadStream(CSV_PATH), basename(CSV_PATH), {
    type: "text/csv",
  }),
});
console.log(`uploaded ${basename(CSV_PATH)} as ${uploaded.id}\n`);

console.log("=== request 1: analyse and chart ===");
const first = await client.messages.create({
  model: MODEL,
  max_tokens: 8000,
  tools: [CODE_EXECUTION],
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text:
            "Load this CSV. Report the trend in deploys per week and the " +
            "rollback rate, then save a single PNG chart of deploys and " +
            "rollbacks over time.",
        },
        { type: "container_upload", file_id: uploaded.id },
      ],
    },
  ],
});
console.log(`blocks: ${blockTypes(first).join(", ")}`);
describeResults(first);
await downloadOutputs(first);
console.log(`\n${textOf(first).trim().slice(0, 500)}\n`);

// Containers persist. Reuse the id and the REPL state is still there.
const containerId = first.container?.id;
if (containerId) {
  console.log(`=== request 2: reusing container ${containerId} ===`);
  const second = await client.messages.create({
    container: containerId,
    model: MODEL,
    max_tokens: 4000,
    tools: [CODE_EXECUTION],
    messages: [
      {
        role: "user",
        content:
          "Using the dataframe you already loaded, what was the worst week " +
          "by rollback rate?",
      },
    ],
  });
  describeResults(second);
  console.log(`\n${textOf(second).trim().slice(0, 300)}`);
}

await client.files.delete(uploaded.id);
console.log(`\ncleaned up ${uploaded.id}`);
console.log(
  "\nNote what changed from the Academy version: the tool type, and the\n" +
    "result block types. Copying its `block.type === 'code_execution_output'`\n" +
    "check into current code silently matches nothing.",
);
