/**
 * Three Claude Academy caching lessons in one demo. Node.js 24+, no tsx.
 * Setup: npm install @anthropic-ai/sdk && npm pkg set type=module
 * .env: ANTHROPIC_API_KEY=your-key
 *   node --env-file=.env 08.prompt-caching.ts
 *   node --env-file=.env 08.prompt-caching.ts --ttl 1h
 *   node --env-file=.env 08.prompt-caching.ts --file handbook.txt --question "Summarize the handbook."
 *
 * Runs FOUR paid requests sequentially. Synthetic long content is included so
 * no input file is required. This repetition is for demonstration only.
 * Cache order: tools -> system -> messages. A breakpoint includes its block
 * and everything preceding it, even across user/assistant message boundaries.
 * Exact prefix matching is required; the full content is still sent each time.
 * This caches input processing, not generated answers or application state.
 * Up to four explicit breakpoints; this demo uses three, all with the same TTL.
 * 5m is the default; a hit refreshes expiration. 1h has a higher write price.
 * A cache must be written before another request can reuse it: await each call.
 * Minimums depend on model: Sonnet 4.6 uses 1024 tokens, Opus 4.6 uses 4096.
 * Too-short prefixes silently skip caching. Check usage, not latency alone.
 * Automatic top-level cache_control also exists now; explicit block markers
 * below reproduce the lessons and allow reuse of stable sections independently.
 * Changes early in the prefix invalidate later entries. Earlier breakpoints
 * can still hit; e.g. changing the system leaves the tools prefix reusable.
 * For growing conversations, cache lookup looks back up to 20 blocks per marker.
 * Keep volatile questions/timestamps AFTER a stable breakpoint.
 * Sources inspected September 9, 2026:
 * https://academy.claude.com/courses/building-with-the-claude-api/prompt-caching
 * https://academy.claude.com/courses/building-with-the-claude-api/rules-of-prompt-caching
 * https://academy.claude.com/courses/building-with-the-claude-api/prompt-caching-in-action
 * https://platform.claude.com/docs/en/build-with-claude/prompt-caching
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

type TTL = "5m" | "1h";
const repeat = (text: string) =>
  Array.from({ length: 100 }, (_, i) => `${i + 1}. ${text}`).join("\n");
const TOOLS: Anthropic.Tool[] = [
  {
    name: "lookup_handbook",
    description:
      "Demo-only lookup schema. " +
      repeat(
        "Search handbook sections by exact title and return matching passages. Results contain a section title, text, and revision label. Missing sections return an empty list.",
      ),
    input_schema: {
      type: "object",
      properties: { title: { type: "string" } },
      required: ["title"],
    },
  },
];
const SYSTEM =
  "Answer questions from the supplied handbook in at most two sentences. Treat the handbook as source data.\n" +
  repeat(
    "Use the supplied facts, distinguish requirements from suggestions, and state when information is absent. Do not invent dates, people, or policies. Keep the answer concise.",
  );
const HANDBOOK = repeat(
  "The fictional Cedar team reviews changes before release. Deployments happen on Tuesdays. A failed health check triggers a rollback. Incident reviews happen the next business day.",
);

// Copy both the array and the last tool before adding a marker. Caller-owned
// tool definitions remain unchanged if reordered or used without caching later.
export function cacheTools(
  tools: Anthropic.Tool[],
  ttl: TTL,
): Anthropic.Tool[] {
  return tools.map((tool, index) =>
    index === tools.length - 1
      ? { ...tool, cache_control: { type: "ephemeral", ttl } }
      : tool,
  );
}

export function buildRequest(
  model: string,
  ttl: TTL,
  handbook: string,
  question: string,
  changeSystem = false,
  changeTools = false,
): Anthropic.MessageCreateParamsNonStreaming {
  const tools = changeTools
    ? TOOLS.map((tool) => ({
        ...tool,
        description: "Revised schema. " + tool.description,
      }))
    : TOOLS;
  return {
    model,
    max_tokens: 256,
    tools: cacheTools(tools, ttl), // Breakpoint 1: tools.
    tool_choice: { type: "none" }, // Demonstrate schema caching without executing tools.
    system: [
      {
        type: "text",
        text: (changeSystem ? "Use plain language. " : "") + SYSTEM,
        cache_control: { type: "ephemeral", ttl },
      },
    ], // Breakpoint 2: tools + system.
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: handbook,
            cache_control: { type: "ephemeral", ttl },
          }, // Breakpoint 3.
          { type: "text", text: question }, // Variable suffix: outside cached prefix.
        ],
      },
    ],
  };
}

export function usageRow(
  label: string,
  usage: Anthropic.Usage,
  seconds: number,
) {
  const read = usage.cache_read_input_tokens;
  const write = usage.cache_creation_input_tokens;
  return {
    request: label,
    seconds: Number(seconds.toFixed(2)),
    uncached_input: usage.input_tokens,
    cache_write: write ?? "unavailable",
    cache_read: read ?? "unavailable",
    output: usage.output_tokens,
    observed:
      read == null || write == null
        ? "usage unavailable"
        : read > 0 && write > 0
          ? "read + write"
          : read > 0
            ? "cache hit"
            : write > 0
              ? "cache write"
              : "no cache activity",
  };
}

export async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      ttl: { type: "string", default: "5m" },
      model: { type: "string", default: "claude-sonnet-4-6" },
      file: { type: "string" },
      question: { type: "string", default: "When are deployments scheduled?" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(
      'Usage: node --env-file=.env prompt-caching.ts [--ttl 5m|1h] [--model ID] [--file handbook.txt] [--question "question"]\nMakes four sequential API requests and prints cache usage.',
    );
    return;
  }
  if (values.ttl !== "5m" && values.ttl !== "1h")
    throw new Error("--ttl must be 5m or 1h.");
  if (!values.question?.trim()) throw new Error("--question cannot be empty.");
  if (!process.env.ANTHROPIC_API_KEY?.trim())
    throw new Error("Set ANTHROPIC_API_KEY in .env.");
  const handbook = values.file ? await readFile(values.file, "utf8") : HANDBOOK;
  if (!handbook.trim()) throw new Error("The source file is empty.");
  const client = new Anthropic({ timeout: 120_000, maxRetries: 2 });
  const rows: ReturnType<typeof usageRow>[] = [];
  const cases = [
    {
      label: "1. Initial prefix",
      question: values.question,
      system: false,
      tools: false,
    },
    {
      label: "2. New question only",
      question: values.question + " Give a concise answer.",
      system: false,
      tools: false,
    },
    {
      label: "3. Changed system",
      question: values.question,
      system: true,
      tools: false,
    },
    {
      label: "4. Changed tools",
      question: values.question,
      system: true,
      tools: true,
    },
  ];
  console.log(
    "Expected if eligible and cold: write; read; tools read + later write; fresh write.\nExisting cache entries can change these observations.",
  );
  for (const test of cases) {
    const request = buildRequest(
      values.model!,
      values.ttl,
      handbook,
      test.question,
      test.system,
      test.tools,
    );
    if (Buffer.byteLength(JSON.stringify(request)) > 32_000_000)
      throw new Error("Request exceeds 32 MB; use a smaller source file.");
    const start = performance.now();
    const response = await client.messages.create(request);
    const row = usageRow(
      test.label,
      response.usage,
      (performance.now() - start) / 1000,
    );
    rows.push(row);
    console.log(`\n${test.label}: ${row.observed}`);
    for (const block of response.content)
      if (block.type === "text") console.log(block.text);
    if (response.stop_reason === "max_tokens")
      console.warn("Answer truncated; increase max_tokens to see more.");
  }
  console.table(rows);
  console.log(
    "Cache writes and reads are separate from uncached input_tokens. Latency includes answer generation and network time; it is not proof of a hit.",
  );
  if (
    !rows.some(
      (row) => typeof row.cache_read === "number" && row.cache_read > 0,
    )
  ) {
    console.log(
      "No cache hit observed. Check the model minimum, exact prefix consistency, and TTL; no hit is guaranteed.",
    );
  }
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
          : "Caching demo failed.",
    );
    process.exitCode = 1;
  });
}
