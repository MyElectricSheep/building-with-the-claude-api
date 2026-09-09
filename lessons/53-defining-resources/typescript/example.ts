/**
 * Lesson 53 - Defining resources.
 *
 * Fixed URIs and URI templates. Templates are discovered by a SEPARATE call -
 * a client that only lists resources never sees them.
 *
 *   npm run lesson -- 53
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  createDocumentServer,
  resourceText,
} from "../../../shared/typescript/mcp-documents.ts";

console.log("defined with:");
console.log('  server.registerResource("documents", "docs://documents", ...)');
console.log(
  '  server.registerResource("document", new ResourceTemplate("docs://documents/{doc_id}"), ...)\n',
);

const server = createDocumentServer();
const client = new Client({ name: "lesson-53", version: "1.0.0" });
const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
await Promise.all([server.connect(serverSide), client.connect(clientSide)]);

console.log("listResources() - concrete URIs");
for (const resource of (await client.listResources()).resources) {
  console.log(`  ${resource.uri}`);
  console.log(`    name: ${resource.name}  mime: ${resource.mimeType}`);
}

// Templates come from a SEPARATE call. A client that only calls listResources()
// will never see them.
console.log("\nlistResourceTemplates() - templates");
for (const template of (await client.listResourceTemplates()).resourceTemplates) {
  console.log(`  ${template.uriTemplate}`);
  console.log(`    name: ${template.name}`);
}

console.log("\nreading a fixed URI");
const fixed = await client.readResource({ uri: "docs://documents" });
fixed.contents.forEach((content, index) => {
  console.log(`  ${content.uri} (${content.mimeType})`);
  // A content block is {uri, text} OR {uri, blob} - resourceText narrows it.
  console.log(`    ${resourceText(fixed)[index]!.split("\n").join(", ")}`);
});

console.log("\nexpanding a template");
for (const docId of ["deploy.md", "incidents.md"]) {
  const result = await client.readResource({ uri: `docs://documents/${docId}` });
  console.log(
    `  docs://documents/${docId} -> ${resourceText(result)[0]!.slice(0, 56)}...`,
  );
}

console.log("\na doc_id that does not exist");
try {
  await client.readResource({ uri: "docs://documents/nope.md" });
  console.log("  (no error - check the handler)");
} catch (error) {
  console.log(
    `  ${error instanceof Error ? error.constructor.name : "Error"}: ` +
      `${String(error).slice(0, 80)}`,
  );
}

await server.close();

console.log(
  "\nA resource is not 'a tool that reads'. A tool is called by the MODEL\n" +
    "mid-turn; a resource is fetched by the APPLICATION, usually before the\n" +
    "turn starts. Lesson 54 uses them.\n\n" +
    "And note: a template parameter is untrusted input. If {doc_id} reaches\n" +
    "a filesystem, the path guard from lesson 30 applies - MCP does not\n" +
    "sanitise it for you.",
);
