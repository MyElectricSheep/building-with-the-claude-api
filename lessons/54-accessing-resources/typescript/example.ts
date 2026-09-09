/**
 * Lesson 54 - Accessing resources from the client side.
 *
 * The correction with teeth: a read returns `contents`, a LIST, and each entry
 * is {uri, text} OR {uri, blob}. The Academy's example assumes one text block.
 *
 *   npm run lesson -- 54
 *   npm run lesson -- 54 -- --no-claude
 */
import type Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { textOf } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";
import { createDocumentServer } from "../../../shared/typescript/mcp-documents.ts";

const QUESTION = "What is the on-call handover time, and what is the SEV1 rule?";

const server = createDocumentServer();
const client = new Client({ name: "lesson-54", version: "1.0.0" });
const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
await Promise.all([server.connect(serverSide), client.connect(clientSide)]);

console.log("concrete resources");
const uris = (await client.listResources()).resources.map((r) => r.uri);
for (const uri of uris) console.log(`  ${uri}`);

console.log("\ntemplates (a SEPARATE call - listResources never shows these)");
for (const template of (await client.listResourceTemplates()).resourceTemplates) {
  console.log(`  ${template.uriTemplate}`);
}
uris.push(...["deploy.md", "oncall.md"].map((id) => `docs://documents/${id}`));

console.log("\nreading each one, without assuming its shape");
const readable: { uri: string; text: string }[] = [];
for (const uri of uris) {
  const result = await client.readResource({ uri });
  console.log(`  ${uri}`);
  console.log(`    ${result.contents.length} content block(s)`);
  result.contents.forEach((content, index) => {
    // The union has no shared discriminant field, so narrow with `in`.
    // `typeof content.text === "string"` does not compile: `text` is absent
    // from the blob variant entirely. That is the guard rail Python lacks.
    if ("text" in content) {
      const preview = content.text.split(/\s+/).join(" ").slice(0, 44);
      console.log(`    [${index}] ${content.mimeType}  text  ${preview}...`);
      readable.push({ uri, text: content.text });
    } else {
      console.log(
        `    [${index}] ${content.mimeType}  blob  ` +
          `${content.blob.length} base64 chars - NOT text`,
      );
    }
  });
}

await server.close();

console.log(
  "\nNever assume one text block. A resource can return several parts, zero\n" +
    "parts, or binary data with no `text` at all. TypeScript catches the last\n" +
    "case at compile time; Python hands you None.",
);

if (process.argv.includes("--no-claude")) {
  console.log("\n--no-claude: skipping the Claude half.");
} else {
  console.log("\n=== injecting the resources into a prompt ===");
  const anthropic = createClient();

  // This is what "the application decides what to include" looks like: the app
  // chose these, the model did not ask for them.
  const content: Anthropic.ContentBlockParam[] = readable.map((entry) => ({
    type: "document",
    source: { type: "text", media_type: "text/plain", data: entry.text },
    title: entry.uri,
    citations: { enabled: true },
  }));
  content.push({ type: "text", text: QUESTION });

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: "Answer from the supplied documents and cite them.",
    messages: [{ role: "user", content }],
  });
  console.log(textOf(response).trim());

  const cited = new Set<string>();
  for (const block of response.content) {
    if (block.type !== "text" || !block.citations) continue;
    for (const citation of block.citations) {
      if ("document_title" in citation && citation.document_title) {
        cited.add(citation.document_title);
      }
    }
  }
  console.log(`\ncited: ${cited.size > 0 ? [...cited].sort().join(", ") : "(none)"}`);
}
