/**
 * Lesson 52 - Implementing an MCP client.
 *
 * The TypeScript SDK has one client layer, not two - you construct the
 * transport explicitly and pass it in. What matters here is the same as in
 * Python: the bridge that turns MCP tools into Anthropic tools.
 *
 *   npm run lesson -- 52
 *   npm run lesson -- 52 -- --no-claude
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  appendAssistantTurn,
  textOf,
  toolUses,
} from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SERVER_SCRIPT = join(REPO_ROOT, "shared", "mcp", "document-server.ts");

async function connect(): Promise<Client> {
  const client = new Client({ name: "lesson-52", version: "1.0.0" });
  // TypeScript has no auto-selecting high-level client: name the transport.
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [SERVER_SCRIPT],
      cwd: REPO_ROOT,
    }),
  );
  return client;
}

console.log("=== connecting over stdio ===");
const mcpClient = await connect();
const { tools: mcpTools } = await mcpClient.listTools();
console.log(`  tools: ${mcpTools.map((tool) => tool.name).join(", ")}\n`);

// The whole conversion. Namespace the names if you connect several servers -
// two servers both exposing `search` is a silent collision.
const tools: Anthropic.Tool[] = mcpTools.map((tool) => ({
  name: tool.name,
  description: tool.description ?? "",
  input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
}));
console.log(`  ${tools.length} MCP tool(s) -> Anthropic tool definitions\n`);

if (process.argv.includes("--no-claude")) {
  console.log("--no-claude: skipping the Claude bridge.");
  await mcpClient.close();
} else {
  console.log("=== bridging MCP tools to Claude ===");
  const anthropic = createClient();
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        "What is the on-call handover time, and what happens if I cannot " +
        "acknowledge a page?",
    },
  ];

  let finished = false;
  for (let turn = 1; turn <= 6 && !finished; turn += 1) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      tools,
      messages,
    });
    appendAssistantTurn(messages, response);

    const calls = toolUses(response);
    if (calls.length === 0) {
      console.log(`  turn ${turn}: done\n`);
      console.log(textOf(response));
      finished = true;
      break;
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const call of calls) {
      console.log(`  turn ${turn}: ${call.name}(${JSON.stringify(call.input)})`);
      const outcome = await mcpClient.callTool({
        name: call.name,
        arguments: call.input as Record<string, unknown>,
      });
      const content = Array.isArray(outcome.content)
        ? (outcome.content as { type: string; text?: string }[])
            .filter((block) => block.type === "text")
            .map((block) => block.text ?? "")
            .join("\n")
        : "";
      results.push({
        type: "tool_result",
        tool_use_id: call.id,
        content,
        // Map the MCP error flag through, so the model can recover instead of
        // seeing a bare string.
        is_error: Boolean(outcome.isError),
      });
    }
    messages.push({ role: "user", content: results });
  }

  if (!finished) console.log("  turn limit reached");
  await mcpClient.close();
}

console.log(
  "\nThe Python side of this lesson also shows the low-level ClientSession -\n" +
    "four layers where v2's high-level Client is one. It was not removed; it\n" +
    "is the escape hatch for when you need to own the streams.",
);
