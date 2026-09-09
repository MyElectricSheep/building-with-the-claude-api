/**
 * stdio entry point for the document MCP server (lessons 49-56, 60).
 *
 *   node shared/mcp/document-server.ts
 *
 * Keep protocol traffic on stdout and diagnostics on stderr - a console.log to
 * stdout in a stdio server corrupts the JSON-RPC stream. `console.error` is
 * safe; `console.log` is not.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createDocumentServer } from "../typescript/mcp-documents.ts";

const server = createDocumentServer();
await server.connect(new StdioServerTransport());
console.error("DocumentMCP listening on stdio");
