/**
 * Lesson 47 - Introducing MCP.
 *
 * Connect to the document server in-process and print what it exposes, with a
 * note on who controls each primitive.
 *
 * No API key needed - this never calls Claude.
 *
 *   npm run lesson -- 47
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createDocumentServer } from "../../../shared/typescript/mcp-documents.ts";

// A linked in-memory transport pair: no subprocess, no stdio, no ports. This is
// how you unit-test an MCP server.
const server = createDocumentServer();
const client = new Client({ name: "lesson-47", version: "1.0.0" });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

const info = client.getServerVersion();
console.log(`server: ${info?.name} v${info?.version}\n`);

console.log("TOOLS - the MODEL decides when to call these");
for (const tool of (await client.listTools()).tools) {
  const required = (tool.inputSchema.required as string[] | undefined) ?? [];
  console.log(`  ${tool.name}(${required.join(", ")})`);
  console.log(`    ${(tool.description ?? "").split("\n")[0]}`);
}

console.log("\nRESOURCES - the APPLICATION chooses what to include");
for (const resource of (await client.listResources()).resources) {
  console.log(`  ${resource.uri}`);
  console.log(`    ${resource.description ?? ""}`);
}
for (const template of (await client.listResourceTemplates()).resourceTemplates) {
  console.log(`  ${template.uriTemplate}  (template)`);
  console.log(`    ${template.description ?? ""}`);
}

console.log("\nPROMPTS - a HUMAN invokes these deliberately");
for (const prompt of (await client.listPrompts()).prompts) {
  const args = (prompt.arguments ?? []).map((argument) => argument.name).join(", ");
  console.log(`  /${prompt.name}(${args})`);
  console.log(`    ${prompt.description ?? ""}`);
}

await server.close();

console.log(
  "\nThe distinction is the point: a resource is not 'a tool that reads'.\n" +
    "A tool is invoked by the model, a resource is fetched by the app, and a\n" +
    "prompt is chosen by a person. Lessons 50-56 build each one.",
);
