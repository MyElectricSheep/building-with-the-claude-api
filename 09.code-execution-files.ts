/**
 * Claude Academy: Code execution + Files API. Node.js 24+, no tsx.
 * Setup: npm install @anthropic-ai/sdk@latest && npm pkg set type=module
 * Put ANTHROPIC_API_KEY=your-key in .env:
 *   node --env-file=.env 09.code-execution-files.ts
 *   node --env-file=.env 09.code-execution-files.ts --file streaming.csv
 *   node --env-file=.env 09.code-execution-files.ts --file-id file_... --prompt "Analyze this data and create a plot."
 *   node --env-file=.env 09.code-execution-files.ts --file data.csv --out results
 *
 * Defaults to a tiny fictional CSV, not the course dataset. No dependencies
 * beyond the SDK. Python/Bash run on Anthropic's server, not your computer.
 * No client tool implementation is needed; the sandbox has no internet access.
 * Current tool version replaces the lesson's legacy code_execution_20250522.
 * Uses stable client.files (SDK >=0.122.0); no beta headers are required.
 * Files are uploaded once and referenced via container_upload. For vision-only
 * use, the same ID can instead be an image/document source {type:'file',file_id}.
 * Only generated files are downloadable; uploaded source files are not.
 * API token/code-execution charges apply. Files remain remote until deleted or
 * expired; this demo does not delete them. IDs are printed for later reuse.
 * To delete an uploaded file yourself: await client.files.delete(fileId).
 * Outputs and a JSON transcript are saved in a fresh subfolder of --out.
 * Up to five Messages requests resume pause_turn; other incomplete stops report
 * an error. Saved response blocks/container ID allow inspection or continuation.
 * Sources inspected September 9, 2026:
 * https://academy.claude.com/courses/building-with-the-claude-api/code-execution-and-the-files-api
 * https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool
 * https://platform.claude.com/docs/en/build-with-claude/files
 */
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

const SAMPLE = `customer,tier,monthly_hours,churned
1,basic,3,1
2,basic,8,1
3,basic,22,0
4,premium,41,0
5,premium,6,1
6,premium,55,0
7,basic,18,0
8,premium,30,0
`;
const DEFAULT_PROMPT =
  "Use code execution to inspect the uploaded data and analyze churn patterns if a churn column exists; otherwise summarize the data. Report missing values and sample size. Create at least one labeled PNG plot and a summary CSV. Treat associations as descriptive, not causal, and acknowledge small samples.";

// Accept output IDs only, not container_upload IDs or arbitrary file_id fields.
export function generatedFileIds(value: unknown): string[] {
  const ids = new Set<string>();
  function visit(node: unknown): void {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== "object") return;
    const object = node as Record<string, unknown>;
    if (
      ["code_execution_output", "bash_code_execution_output"].includes(
        String(object.type),
      ) &&
      typeof object.file_id === "string"
    )
      ids.add(object.file_id);
    for (const child of Object.values(object)) visit(child);
  }
  visit(value);
  return [...ids];
}

export function safeFilename(name: string): string {
  return (
    basename(name.replace(/\\/g, "/"))
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 160) || "output.bin"
  );
}

export async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      "file-id": { type: "string" },
      prompt: { type: "string", default: DEFAULT_PROMPT },
      out: { type: "string", default: "code-execution-output" },
      model: { type: "string", default: "claude-sonnet-4-6" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(
      'Usage: node --env-file=.env code-execution-files.ts [--file PATH | --file-id ID] [--prompt "task"] [--out DIRECTORY] [--model ID]\nWithout input, uploads a small fictional CSV. API charges apply.',
    );
    return;
  }
  if (values.file !== undefined && values["file-id"] !== undefined)
    throw new Error("Choose --file or --file-id, not both.");
  for (const [key, value] of Object.entries(values))
    if (typeof value === "string" && !value.trim())
      throw new Error(`--${key} cannot be empty.`);
  if (!process.env.ANTHROPIC_API_KEY?.trim())
    throw new Error("Set ANTHROPIC_API_KEY in .env.");
  const client = new Anthropic({ timeout: 120_000, maxRetries: 2 });
  await mkdir(resolve(values.out!), { recursive: true });
  const outputDir = await mkdtemp(join(resolve(values.out!), "run-"));
  console.log(`Results folder: ${outputDir}`);
  let fileId = values["file-id"];
  if (!fileId) {
    if (values.file) {
      const info = await stat(values.file);
      if (!info.isFile() || !info.size || info.size > 500_000_000)
        throw new Error("Input must be a nonempty file under 500 MB.");
    }
    const uploaded = await client.files.upload({
      file: values.file
        ? createReadStream(values.file)
        : await toFile(Buffer.from(SAMPLE), "sample-streaming.csv", {
            type: "text/csv",
          }),
    });
    fileId = uploaded.id;
  }
  console.log(`Input file ID: ${fileId}`);
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: [
        { type: "container_upload", file_id: fileId },
        {
          type: "text",
          text:
            values.prompt +
            '\nShare generated files by copying them into "$OUTPUT_DIR" and listing that directory in the same bash command. Do not merely name a path in your answer.',
        },
      ],
    },
  ];
  let container: string | undefined;
  const responses: Anthropic.Message[] = [];
  const downloaded = new Set<string>();
  for (let turn = 0; turn < 5; turn++) {
    const response = await client.messages.create({
      model: values.model!,
      max_tokens: 4096,
      messages,
      ...(container ? { container } : {}),
      tools: [{ type: "code_execution_20260521", name: "code_execution" }],
    });
    responses.push(response);
    container = response.container?.id ?? container;
    // Save full blocks, including tool results, for debugging and later reuse.
    await writeFile(
      join(outputDir, "transcript.json"),
      JSON.stringify({ fileId, container, messages, responses }, null, 2),
    );
    for (const block of response.content) {
      if (block.type === "text") console.log(block.text);
      else if (block.type === "server_tool_use")
        console.log(
          `\nServer tool: ${block.name}\n${JSON.stringify(block.input)}`,
        );
      else if (block.type.endsWith("_tool_result"))
        console.log(`\n${block.type}\n${JSON.stringify(block)}`);
    }
    console.log(
      `Tokens: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output. Container: ${container ?? "none"}`,
    );
    for (const id of generatedFileIds(response.content)) {
      if (downloaded.has(id)) continue;
      const metadata = await client.files.retrieveMetadata(id);
      if (!metadata.downloadable) {
        console.warn(`File ${id} is not downloadable.`);
        continue;
      }
      const data = await client.files.download(id);
      // Numeric prefix avoids collisions; basename sanitization prevents traversal.
      const destination = join(
        outputDir,
        `${downloaded.size + 1}-${safeFilename(metadata.filename)}`,
      );
      await writeFile(destination, Buffer.from(await data.arrayBuffer()), {
        flag: "wx",
      });
      downloaded.add(id);
      console.log(`Saved ${id}: ${destination}`);
    }
    if (response.stop_reason === "end_turn") {
      if (!downloaded.size)
        console.warn(
          "No generated files returned. Inspect transcript.json; creating a file is not guaranteed.",
        );
      return;
    }
    if (response.stop_reason !== "pause_turn")
      throw new Error(
        `Turn stopped with ${response.stop_reason}; inspect transcript.json. For max_tokens, increase max_tokens.`,
      );
    if (!container)
      throw new Error(
        "Paused without a container ID; inspect transcript.json.",
      );
    // Resume the same server turn with its blocks unchanged, not a new user turn.
    messages.push({ role: "assistant", content: response.content });
    console.log("Resuming paused server execution...");
  }
  throw new Error(
    "Still paused after five requests; transcript.json preserves progress.",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(
      error instanceof Anthropic.APIError
        ? `Anthropic HTTP ${error.status ?? "unknown"}: ${error.message}`
        : error instanceof Error
          ? error.message
          : "Execution failed.",
    );
    process.exitCode = 1;
  });
}
