/**
 * Lesson 31 - The web search tool.
 *
 * A SERVER tool: Anthropic runs it, you never return a tool_result. The
 * Academy's version still works; newer ones add dynamic filtering and response
 * inclusion.
 *
 *   npm run lesson -- 31
 */
import type Anthropic from "@anthropic-ai/sdk";
import { blockTypes, formatUsage, textOf } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";

const QUESTION = "In two sentences, what is the Model Context Protocol used for?";

const VARIANTS = [
  ["web_search_20250305 (the Academy version)", "web_search_20250305"],
  [
    "web_search_20260318 (dynamic filtering + response inclusion)",
    "web_search_20260318",
  ],
] as const;

const client = createClient();

function showCitations(response: Anthropic.Message): void {
  const seen = new Set<string>();
  for (const block of response.content) {
    if (block.type !== "text" || !block.citations) continue;
    for (const citation of block.citations) {
      if (citation.type !== "web_search_result_location") continue;
      if (seen.has(citation.url)) continue;
      seen.add(citation.url);
      console.log(`    - ${citation.title ?? "(untitled)"}  ${citation.url}`);
    }
  }
  if (seen.size === 0) console.log("    (none)");
}

async function run(label: string, toolType: string): Promise<void> {
  console.log(`--- ${label} ---`);

  // Do NOT also declare code_execution here: on _20260209 and later the API
  // provisions the sandbox for dynamic filtering itself, and a second execution
  // environment confuses the model.
  const tool = { type: toolType, name: "web_search", max_uses: 2 };
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: QUESTION }];

  let response: Anthropic.Message | undefined;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      tools: [tool as Anthropic.Messages.ToolUnion],
      messages,
    });

    // A long search turn can pause. Send the assistant turn back unchanged to
    // continue - encrypted_content must survive verbatim.
    if (response.stop_reason === "pause_turn") {
      console.log("  pause_turn - resuming");
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    break;
  }
  if (!response) throw new Error("no response");

  console.log(`  blocks:   ${blockTypes(response).join(", ")}`);
  console.log(
    `  searches: ${response.usage.server_tool_use?.web_search_requests ?? 0}`,
  );
  console.log(`  usage:    ${formatUsage(response.usage)}`);

  // Server-tool errors arrive as HTTP 200 with an error OBJECT where a LIST of
  // results would be. Branch on that before indexing.
  for (const block of response.content) {
    if (block.type === "web_search_tool_result" && !Array.isArray(block.content)) {
      console.log(`  search error (still a 200): ${block.content.error_code}`);
    }
  }

  console.log("  citations:");
  showCitations(response);
  console.log(`\n  ${textOf(response).trim().slice(0, 400)}\n`);
}

for (const [label, toolType] of VARIANTS) {
  await run(label, toolType);
}

console.log(
  "Compare the input token counts. Dynamic filtering (20260209 and later)\n" +
    "runs code that filters results before they enter the context window, so\n" +
    "a search-heavy request costs less. That is the reason to move versions -\n" +
    "not that the old one stopped working.",
);
