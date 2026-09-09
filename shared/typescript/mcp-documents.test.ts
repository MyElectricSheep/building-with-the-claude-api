import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createDocumentServer } from "./mcp-documents.ts";

/**
 * A linked in-memory transport pair: no subprocess, no stdio, no ports. This is
 * how you unit-test an MCP server.
 */
async function connect() {
  const server = createDocumentServer();
  const client = new Client({ name: "test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
}

test("the server advertises its tools, resources and prompts", async () => {
  const { client, server } = await connect();
  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map((tool) => tool.name).sort(), [
    "edit_document",
    "list_documents",
    "read_document",
  ]);

  const resources = await client.listResources();
  assert.ok(resources.resources.some((r) => r.uri === "docs://documents"));

  const templates = await client.listResourceTemplates();
  assert.ok(
    templates.resourceTemplates.some(
      (t) => t.uriTemplate === "docs://documents/{doc_id}",
    ),
  );

  const prompts = await client.listPrompts();
  assert.deepEqual(prompts.prompts.map((p) => p.name).sort(), [
    "compare_documents",
    "summarise_document",
  ]);
  await server.close();
});

test("read_document returns content and errors as a result, not a throw", async () => {
  const { client, server } = await connect();
  const ok = await client.callTool({
    name: "read_document",
    arguments: { doc_id: "oncall.md" },
  });
  assert.equal(ok.isError, undefined);

  const bad = await client.callTool({
    name: "read_document",
    arguments: { doc_id: "nope.md" },
  });
  assert.equal(bad.isError, true);
  await server.close();
});

test("edit_document enforces exactly one match", async () => {
  const { client, server } = await connect();
  const missing = await client.callTool({
    name: "edit_document",
    arguments: { doc_id: "oncall.md", old_text: "zzz", new_text: "x" },
  });
  assert.equal(missing.isError, true);

  const applied = await client.callTool({
    name: "edit_document",
    arguments: {
      doc_id: "oncall.md",
      old_text: "15 minutes",
      new_text: "10 minutes",
    },
  });
  assert.equal(applied.isError, undefined);
  await server.close();
});

test("a resource read returns a contents LIST, not a single block", async () => {
  const { client, server } = await connect();
  const result = await client.readResource({ uri: "docs://documents/deploy.md" });
  // Never assume exactly one block - that is the lesson-54 correction.
  assert.ok(Array.isArray(result.contents));
  assert.ok(result.contents.length >= 1);
  await server.close();
});

test("a prompt renders to messages", async () => {
  const { client, server } = await connect();
  const prompt = await client.getPrompt({
    name: "summarise_document",
    arguments: { doc_id: "oncall.md" },
  });
  assert.equal(prompt.messages[0]!.role, "user");
  assert.match(JSON.stringify(prompt.messages[0]!.content), /oncall\.md/);
  await server.close();
});
