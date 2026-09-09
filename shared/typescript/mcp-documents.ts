/**
 * The document MCP server used by lessons 47-56 and 60, TypeScript side.
 *
 * The TypeScript SDK did not go through the FastMCP -> MCPServer rename that
 * broke the Python lessons: it has always exported `McpServer`. What it did do
 * is add `registerTool` / `registerResource` / `registerPrompt`, which take a
 * config object and are what current code should use - the older positional
 * `tool()` / `resource()` / `prompt()` overloads still exist.
 *
 * Kept importable rather than script-only so a client can connect to it
 * in-process over `InMemoryTransport`, with no subprocess, which is what makes
 * lessons 52-56 testable.
 */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export const DOCUMENTS: Record<string, string> = {
  "deploy.md":
    "Kestrel deploys on merge to main. Rollout is progressive: 5%, 50%, " +
    "100%, ten minutes apart. `kestrel rollback <service>` reverts in about " +
    "90 seconds. Migrations are NOT reverted by a rollback.",
  "oncall.md":
    "On-call rotates weekly, handing over Wednesday at 10:00 Europe/Lisbon. " +
    "Acknowledge a page within 15 minutes or escalate to the secondary.",
  "incidents.md":
    "SEV1: product unusable or data at risk, page immediately. " +
    "SEV2: a major feature is broken, page during business hours. " +
    "SEV3: degraded but usable, next working day. " +
    "Retrospective due within five working days, blameless.",
};

export function createDocumentServer(): McpServer {
  const server = new McpServer({ name: "DocumentMCP", version: "2.0.0" });

  server.registerTool(
    "read_document",
    {
      description: "Read a document by its exact id.",
      inputSchema: {
        doc_id: z.string().describe("One of the ids returned by list_documents."),
      },
    },
    ({ doc_id }) => {
      const text = DOCUMENTS[doc_id];
      if (text === undefined) {
        // An error result, not a thrown exception: the client should see it as
        // a tool error the model can react to.
        return {
          isError: true,
          content: [{ type: "text", text: `Unknown document id: ${doc_id}` }],
        };
      }
      return { content: [{ type: "text", text }] };
    },
  );

  server.registerTool(
    "list_documents",
    { description: "List every available document id.", inputSchema: {} },
    () => ({
      content: [{ type: "text", text: Object.keys(DOCUMENTS).sort().join("\n") }],
    }),
  );

  server.registerTool(
    "edit_document",
    {
      description: "Replace an exact string in a document.",
      inputSchema: {
        doc_id: z.string(),
        old_text: z.string().describe("Must appear exactly once."),
        new_text: z.string(),
      },
    },
    ({ doc_id, old_text, new_text }) => {
      const text = DOCUMENTS[doc_id];
      if (text === undefined) {
        return {
          isError: true,
          content: [{ type: "text", text: `Unknown document id: ${doc_id}` }],
        };
      }
      const occurrences = text.split(old_text).length - 1;
      if (occurrences !== 1) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                occurrences === 0
                  ? "old_text not found in the document"
                  : `old_text matched ${occurrences} times; it must match once`,
            },
          ],
        };
      }
      DOCUMENTS[doc_id] = text.replace(old_text, new_text);
      return { content: [{ type: "text", text: `Edited ${doc_id}.` }] };
    },
  );

  server.registerResource(
    "documents",
    "docs://documents",
    { description: "The list of document ids." },
    (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/plain",
          text: Object.keys(DOCUMENTS).sort().join("\n"),
        },
      ],
    }),
  );

  server.registerResource(
    "document",
    new ResourceTemplate("docs://documents/{doc_id}", { list: undefined }),
    { description: "One document's contents, addressed by URI template." },
    (uri, variables) => {
      const docId = String(variables.doc_id);
      const text = DOCUMENTS[docId];
      if (text === undefined) throw new Error(`Unknown document id: ${docId}`);
      return { contents: [{ uri: uri.href, mimeType: "text/plain", text }] };
    },
  );

  // A deliberately BINARY resource, so lesson 54 can exercise the blob branch.
  // A resource content block is {uri, text} OR {uri, blob}.
  server.registerResource(
    "logo",
    "docs://logo",
    { description: "A 1x1 PNG - a binary resource.", mimeType: "image/png" },
    (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "image/png",
          blob:
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk" +
            "YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        },
      ],
    }),
  );

  server.registerPrompt(
    "summarise_document",
    {
      description: "A reusable prompt for summarising one document.",
      argsSchema: { doc_id: z.string() },
    },
    ({ doc_id }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Read the document '${doc_id}' with the read_document tool, then ` +
              "summarise it in exactly two sentences. Name the document id.",
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "compare_documents",
    {
      description: "A reusable prompt for comparing two documents.",
      argsSchema: { first: z.string(), second: z.string() },
    },
    ({ first, second }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Read '${first}' and '${second}' with the read_document tool. ` +
              "List what they agree on and where they could conflict in practice.",
          },
        },
      ],
    }),
  );

  return server;
}

/**
 * Extract the text from a resource read result.
 *
 * A resource content block is `{uri, text}` OR `{uri, blob}` - never assume
 * which, and never assume there is exactly one block. TypeScript enforces the
 * first half of that; the second is on you. This is the lesson-54 correction.
 */
export function resourceText(result: {
  contents: readonly ({ uri: string; text: string } | { uri: string; blob: string })[];
}): string[] {
  // The union has no shared discriminant, so narrow with `in`.
  return result.contents.map((content) =>
    "text" in content
      ? content.text
      : `[binary blob, ${content.blob.length} base64 chars]`,
  );
}
