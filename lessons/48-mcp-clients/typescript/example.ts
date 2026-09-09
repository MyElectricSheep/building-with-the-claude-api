/**
 * Lesson 48 - MCP clients and transports.
 *
 * The same server reached three ways: in-process, stdio, and Streamable HTTP.
 * WebSockets are not on the list - they were never in the spec.
 *
 *   npm run lesson -- 48
 */
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createDocumentServer } from "../../../shared/typescript/mcp-documents.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SERVER_SCRIPT = join(REPO_ROOT, "shared", "mcp", "document-server.ts");

async function exercise(client: Client): Promise<void> {
  const started = Date.now();
  const tools = await client.listTools();
  const result = await client.callTool({
    name: "read_document",
    arguments: { doc_id: "oncall.md" },
  });
  const content = result.content as { type: string; text?: string }[];
  console.log(`  tools:      ${tools.tools.length}`);
  console.log(`  call:       ${(content[0]?.text ?? "").slice(0, 52)}...`);
  console.log(`  round trip: ${Date.now() - started} ms\n`);
}

// 1. In-process. No transport at all.
console.log("1. in-process - no transport at all");
console.log("   (InMemoryTransport.createLinkedPair; this is how you test a server)");
{
  const server = createDocumentServer();
  const client = new Client({ name: "lesson-48", version: "1.0.0" });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  await exercise(client);
  await server.close();
}

// 2. stdio. A real subprocess.
console.log("2. stdio - a real subprocess, for a LOCAL server");
{
  const client = new Client({ name: "lesson-48", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER_SCRIPT],
    cwd: REPO_ROOT,
  });
  await client.connect(transport);
  await exercise(client);
  await client.close();
}
console.log(
  "   Protocol traffic goes on stdout; diagnostics on stderr. A stray\n" +
    "   console.log in a stdio server corrupts the JSON-RPC stream -\n" +
    "   console.error is safe.\n",
);

// 3. Streamable HTTP. For a remote server. `node:http` is enough - the SDK
//    transport just needs (req, res).
console.log("3. Streamable HTTP - for a REMOTE server");
{
  const server = createDocumentServer();
  // Stateful mode: the server mints a session id and returns it in the
  // Mcp-Session-Id header, and the client sends it back on every later request.
  // (Stateless mode is `sessionIdGenerator: undefined`.)
  const serverTransport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  await server.connect(serverTransport);

  // `node:http` is enough - the transport reads the stream itself. (With
  // express you would pass the already-parsed `req.body` as a third argument.)
  const http = createServer((request, response) => {
    void serverTransport.handleRequest(request, response);
  });
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const address = http.address();
  const port = typeof address === "object" && address ? address.port : 0;

  try {
    const client = new Client({ name: "lesson-48", version: "1.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)),
    );
    await exercise(client);
    await client.close();
  } finally {
    await server.close();
    await new Promise<void>((resolve) => http.close(() => resolve()));
  }
}

console.log(
  "Note what is NOT here: WebSockets. They were never part of the MCP\n" +
    "specification, and the Python SDK v2 removed the `ws` extra outright.\n" +
    "Streamable HTTP superseded the older HTTP+SSE transport - though\n" +
    "Streamable HTTP can itself use SSE, so 'SSE is gone' would be inaccurate.",
);
