/**
 * Lesson 51 - A terminal server inspector.
 *
 * `mcp dev` opens the browser Inspector (Python CLI only). This does the same
 * walk in a terminal, and unlike the Inspector it can be committed as a test.
 *
 *   npm run lesson -- 51
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createDocumentServer } from "../../../shared/typescript/mcp-documents.ts";

const SAMPLE_ARGUMENTS: Record<string, Record<string, unknown>> = {
  read_document: { doc_id: "oncall.md" },
  list_documents: {},
  edit_document: {
    doc_id: "oncall.md",
    old_text: "15 minutes",
    new_text: "ten minutes",
  },
};

const firstText = (result: Record<string, unknown>): string => {
  const { content } = result;
  if (!Array.isArray(content)) return "";
  const block = (content as { type: string; text?: string }[]).find(
    (entry) => entry.type === "text",
  );
  return block?.text ?? "";
};

const server = createDocumentServer();
const client = new Client({ name: "lesson-51", version: "1.0.0" });
const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
await Promise.all([server.connect(serverSide), client.connect(clientSide)]);

const problems: string[] = [];

console.log("TOOLS");
for (const tool of (await client.listTools()).tools) {
  if (!(tool.description ?? "").trim()) {
    problems.push(`tool ${tool.name} has no description`);
  }
  const args = SAMPLE_ARGUMENTS[tool.name];
  if (!args) {
    console.log(`  ${tool.name.padEnd(16)} (no sample arguments, not called)`);
    continue;
  }
  const result = await client.callTool({ name: tool.name, arguments: args });
  const marker = result.isError ? "ERROR" : "ok";
  console.log(
    `  ${tool.name.padEnd(16)} [${marker}] ${firstText(result).slice(0, 56)}`,
  );
  if (result.isError) {
    problems.push(`tool ${tool.name} failed on plausible arguments`);
  }
}

console.log("\nRESOURCES");
for (const resource of (await client.listResources()).resources) {
  const result = await client.readResource({ uri: resource.uri });
  console.log(
    `  ${resource.uri.padEnd(28)} ${result.contents.length} content block(s)`,
  );
}

console.log("\nRESOURCE TEMPLATES");
for (const template of (await client.listResourceTemplates()).resourceTemplates) {
  const expanded = template.uriTemplate.replace("{doc_id}", "deploy.md");
  try {
    const result = await client.readResource({ uri: expanded });
    console.log(`  ${expanded.padEnd(28)} ${result.contents.length} content block(s)`);
  } catch (error) {
    console.log(`  ${expanded.padEnd(28)} FAILED: ${error}`);
    problems.push(`template ${template.uriTemplate} did not expand`);
  }
}

console.log("\nPROMPTS");
for (const prompt of (await client.listPrompts()).prompts) {
  const args = Object.fromEntries(
    (prompt.arguments ?? []).map((argument) => [argument.name, "oncall.md"]),
  );
  try {
    const rendered = await client.getPrompt({ name: prompt.name, arguments: args });
    const first = rendered.messages[0]!;
    const text =
      first.content.type === "text"
        ? first.content.text.slice(0, 40)
        : first.content.type;
    console.log(
      `  /${prompt.name.padEnd(20)} ${rendered.messages.length} message(s), ` +
        `${first.role}: ${text}...`,
    );
  } catch (error) {
    console.log(`  /${prompt.name.padEnd(20)} FAILED: ${error}`);
    problems.push(`prompt ${prompt.name} did not render`);
  }
}

await server.close();

console.log("\n=== verdict ===");
if (problems.length > 0) {
  for (const problem of problems) console.log(`  [problem] ${problem}`);
} else {
  console.log("  every tool, resource, template and prompt responded");
}

console.log(
  "\nFor the browser Inspector on a TypeScript server:\n" +
    "  npx @modelcontextprotocol/inspector node shared/mcp/document-server.ts\n\n" +
    "The Python CLI's `mcp dev` does the same for a Python server.",
);
