/**
 * Lesson 56 - Prompts in the client.
 *
 * The loop this module has been building: the user picks a prompt, the SERVER
 * renders it, the client converts it, and the model uses the server's tools.
 *
 *   npm run lesson -- 56
 *   npm run lesson -- 56 -- --no-claude
 */
import type Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import {
  appendAssistantTurn,
  textOf,
  toolUses,
} from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";
import { createDocumentServer } from "../../../shared/typescript/mcp-documents.ts";

/**
 * Convert MCP prompt messages to Anthropic message params.
 *
 * They look alike, which is exactly why this conversion gets skipped. A
 * message's content can be text, an image, or an embedded resource - do not
 * assume text, and do not stringify a resource.
 */
function toAnthropicMessages(rendered: GetPromptResult): Anthropic.MessageParam[] {
  return rendered.messages.map((message): Anthropic.MessageParam => {
    const role = message.role === "assistant" ? "assistant" : "user";
    if (message.content.type === "text") {
      return { role, content: message.content.text };
    }
    if (message.content.type === "resource") {
      // Promote an embedded resource to a document block rather than
      // flattening it into a string.
      const { resource } = message.content;
      return {
        role,
        content: [
          {
            type: "document",
            source: {
              type: "text",
              media_type: "text/plain",
              data: "text" in resource ? resource.text : "",
            },
            title: String(resource.uri),
          },
        ],
      };
    }
    return { role, content: `[unsupported block: ${message.content.type}]` };
  });
}

const server = createDocumentServer();
const mcpClient = new Client({ name: "lesson-56", version: "1.0.0" });
const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
await Promise.all([server.connect(serverSide), mcpClient.connect(clientSide)]);

console.log("=== the menu a user would see ===");
for (const prompt of (await mcpClient.listPrompts()).prompts) {
  const names = (prompt.arguments ?? []).map((a) => a.name).join(", ");
  console.log(`  /${prompt.name}(${names})  -  ${prompt.description}`);
}

console.log("\n=== user picks /summarise_document doc_id=incidents.md ===");
const rendered = await mcpClient.getPrompt({
  name: "summarise_document",
  arguments: { doc_id: "incidents.md" },
});
console.log(`  the server rendered ${rendered.messages.length} message(s):`);
for (const message of rendered.messages) {
  const text =
    message.content.type === "text"
      ? message.content.text
      : `[${message.content.type}]`;
  console.log(`    [${message.role}] ${text}`);
}

const messages = toAnthropicMessages(rendered);
console.log(`\n  converted to ${messages.length} Anthropic message param(s)`);

if (process.argv.includes("--no-claude")) {
  console.log("\n--no-claude: skipping the Claude half.");
  await server.close();
} else {
  console.log("\n=== running it, with the server's tools available ===");
  const anthropic = createClient();
  const tools: Anthropic.Tool[] = (await mcpClient.listTools()).tools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? "",
    input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
  }));

  let finished = false;
  for (let turn = 1; turn <= 6 && !finished; turn += 1) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      tools,
      messages,
    });
    appendAssistantTurn(messages, response);

    const calls = toolUses(response);
    if (calls.length === 0) {
      console.log(`\n  turn ${turn}: done\n`);
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
        is_error: Boolean(outcome.isError),
      });
    }
    messages.push({ role: "user", content: results });
  }

  if (!finished) console.log("  turn limit reached");
  await server.close();
}

console.log(
  "\nThat is the whole loop: the SERVER supplied both the wording and the\n" +
    "tools; the client only supplied the loop. Improve the prompt on the\n" +
    "server and every client that uses it improves.",
);
