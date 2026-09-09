/**
 * Lesson 49 - Project setup: which MCP SDK do you actually have?
 *
 * The TypeScript side of this lesson is much smaller than the Python side,
 * because the TS SDK never went through the FastMCP -> MCPServer rename. This
 * reports the installed version and checks the entry points this module uses.
 *
 * No API key, no network.
 *
 *   npm run lesson -- 49
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version } = require("@modelcontextprotocol/sdk/package.json") as {
  version: string;
};

console.log(`@modelcontextprotocol/sdk: ${version}\n`);

const ENTRY_POINTS: [string, string, string][] = [
  ["@modelcontextprotocol/sdk/server/mcp.js", "McpServer", "server class"],
  ["@modelcontextprotocol/sdk/server/mcp.js", "ResourceTemplate", "URI templates"],
  ["@modelcontextprotocol/sdk/client/index.js", "Client", "client"],
  ["@modelcontextprotocol/sdk/client/stdio.js", "StdioClientTransport", "stdio"],
  [
    "@modelcontextprotocol/sdk/client/streamableHttp.js",
    "StreamableHTTPClientTransport",
    "Streamable HTTP",
  ],
  ["@modelcontextprotocol/sdk/inMemory.js", "InMemoryTransport", "in-process tests"],
];

console.log("entry-point checks");
for (const [specifier, name, label] of ENTRY_POINTS) {
  try {
    const loaded = (await import(specifier)) as Record<string, unknown>;
    const ok = name in loaded;
    console.log(`  [${ok ? "yes" : "no "}] ${label.padEnd(20)} ${name}`);
  } catch (error) {
    console.log(
      `  [no ] ${label.padEnd(20)} ${name}  ` +
        `${error instanceof Error ? error.message.slice(0, 50) : ""}`,
    );
  }
}

console.log(
  "\nNo WebSocket transport is listed, and that is correct: WebSockets were\n" +
    "never part of the MCP specification.\n\n" +
    "The Python side of this lesson is the interesting one - a fresh `mcp`\n" +
    "install gives you SDK v2, and the Academy's lessons 50-56 were written\n" +
    "for v1. Run `uv run lesson 49` for that half.",
);
