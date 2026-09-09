/**
 * Lesson 55 - Defining prompts.
 *
 * The TS SDK's current form is `registerPrompt(name, {description, argsSchema},
 * handler)`. There is no equivalent of the Python v1 helper-import breakage -
 * see `uv run lesson 55 legacy` for that half.
 *
 *   npm run lesson -- 55
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createDocumentServer } from "../../../shared/typescript/mcp-documents.ts";

console.log("defined with:");
console.log("  server.registerPrompt(name, { description, argsSchema }, handler)");
console.log("  where argsSchema is a Zod shape and the handler returns { messages }\n");

const server = createDocumentServer();
const client = new Client({ name: "lesson-55", version: "1.0.0" });
const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
await Promise.all([server.connect(serverSide), client.connect(clientSide)]);

console.log("what a client's slash-command menu would show");
for (const prompt of (await client.listPrompts()).prompts) {
  const args = prompt.arguments ?? [];
  const signature = args
    .map((argument) => `${argument.name}${argument.required ? "" : "?"}`)
    .join(", ");
  console.log(`  /${prompt.name}(${signature})`);
  // The description IS the menu entry. Write it for a human.
  console.log(`    ${prompt.description}`);
  for (const argument of args) {
    console.log(`      ${argument.name}: required=${argument.required}`);
  }
}

const show = (
  messages: readonly {
    role: string;
    content: { type: string; text?: string };
  }[],
) => {
  for (const message of messages) {
    // Prompt message content is a union (text, image, resource, ...). Narrow.
    const text = message.content.text ?? `[${message.content.type}]`;
    console.log(`  [${message.role}] ${text}`);
  }
};

console.log("\nrendered with real arguments");
show(
  (
    await client.getPrompt({
      name: "summarise_document",
      arguments: { doc_id: "deploy.md" },
    })
  ).messages,
);

console.log();
show(
  (
    await client.getPrompt({
      name: "compare_documents",
      arguments: { first: "deploy.md", second: "incidents.md" },
    })
  ).messages,
);

console.log("\na missing required argument");
try {
  await client.getPrompt({ name: "summarise_document", arguments: {} });
  console.log("  (no error - check the handler)");
} catch (error) {
  console.log(
    `  ${error instanceof Error ? error.constructor.name : "Error"}: ` +
      `${String(error).slice(0, 80)}`,
  );
}

await server.close();

console.log(
  "\nThe SERVER owns the wording. Improve the prompt here and every client\n" +
    "that uses it improves, with no client change. That is the argument for a\n" +
    "prompt over a hardcoded string in each application.\n\n" +
    "And a prompt is not a tool: if the MODEL should decide when to run it,\n" +
    "it is a tool. A prompt is for when a PERSON decides.",
);
