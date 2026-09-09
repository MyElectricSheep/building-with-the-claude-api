/**
 * Lesson 50 - Defining tools with MCP, TypeScript side.
 *
 * The TS SDK never went through the FastMCP -> MCPServer rename that breaks the
 * Python lessons. What it added is `registerTool(name, config, handler)`, which
 * is what current code should use.
 *
 *   npm run lesson -- 50
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createDocumentServer } from "../../../shared/typescript/mcp-documents.ts";

console.log("server built with:");
console.log('  import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"');
console.log("  server.registerTool(name, { description, inputSchema }, handler)\n");

const server = createDocumentServer();
const client = new Client({ name: "lesson-50", version: "1.0.0" });
const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
await Promise.all([server.connect(serverSide), client.connect(clientSide)]);

const { tools } = await client.listTools();
for (const tool of tools) {
  console.log(tool.name);
  console.log(`  description: ${(tool.description ?? "").split("\n")[0]}`);
  console.log(`  schema:      ${JSON.stringify(tool.inputSchema)}`);
}
console.log();

/**
 * A tool result carries either `content` (blocks) or `toolResult` (structured),
 * so the SDK types it as a union - narrow before reading.
 */
const textOf = (result: Record<string, unknown>): string[] => {
  const { content } = result;
  if (!Array.isArray(content)) return [];
  return (content as { type: string; text?: string }[])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "");
};

console.log("calling them");
const listed = await client.callTool({ name: "list_documents", arguments: {} });
console.log(`  list_documents() -> ${JSON.stringify(textOf(listed))}`);

const read = await client.callTool({
  name: "read_document",
  arguments: { doc_id: "deploy.md" },
});
console.log(`  read_document('deploy.md') -> ${textOf(read)[0]?.slice(0, 60)}...`);

const edited = await client.callTool({
  name: "edit_document",
  arguments: {
    doc_id: "deploy.md",
    old_text: "90 seconds",
    new_text: "two minutes",
  },
});
console.log(`  edit_document(...) -> ${textOf(edited)[0]}`);

console.log("\nerror paths - a tool error is a RESULT, not a protocol failure");
for (const [name, args, label] of [
  ["read_document", { doc_id: "nope.md" }, "unknown document"],
  ["read_document", {}, "missing required argument"],
  ["no_such_tool", {}, "hallucinated tool name"],
  [
    "edit_document",
    { doc_id: "oncall.md", old_text: "not present", new_text: "x" },
    "no match for old_text",
  ],
] as const) {
  try {
    const result = await client.callTool({ name, arguments: args });
    const marker = result.isError ? "isError" : "ok";
    console.log(`  ${label.padEnd(26)} ${marker}: ${textOf(result)[0]?.slice(0, 60)}`);
  } catch (error) {
    console.log(
      `  ${label.padEnd(26)} threw: ${error instanceof Error ? error.message.slice(0, 60) : error}`,
    );
  }
}

await server.close();

console.log(
  "\nThis server returns { isError: true, content: [...] } explicitly. The\n" +
    "Python decorator turns a raised ValueError into the same thing. Either\n" +
    "way the model sees something it can react to, rather than the connection\n" +
    "failing.\n\n" +
    "The Python half of this lesson is the interesting one: `mcp.server.fastmcp`\n" +
    "was REMOVED in SDK v2. Run `uv run lesson 50 legacy` for that.",
);
