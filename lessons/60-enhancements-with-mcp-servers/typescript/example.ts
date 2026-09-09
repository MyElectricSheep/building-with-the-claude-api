/**
 * Lesson 60 - Wiring this repository's MCP server into Claude Code.
 *
 * Generates the exact `claude mcp add` command and the exact .mcp.json, with
 * paths resolved, so you copy one line rather than reconstruct it.
 *
 * No API key, no network.
 *
 *   npm run lesson -- 60
 *   npm run lesson -- 60 -- --write
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const MCP_JSON = join(REPO_ROOT, ".mcp.json");

const SERVERS: Record<string, { command: string; args: string[] }> = {
  "documents-py": { command: "uv", args: ["run", "shared/mcp/document_server.py"] },
  "documents-ts": { command: "node", args: ["shared/mcp/document-server.ts"] },
};

console.log(`repository root: ${REPO_ROOT}\n`);
console.log("=== the command, modernized ===\n");
console.log("Academy (ambiguous - is `uv` the command or the transport?):");
console.log("  claude mcp add documents uv run main.py\n");
console.log("Current (explicit transport, `--` separates the server's command):");
for (const [name, server] of Object.entries(SERVERS)) {
  console.log(
    `  claude mcp add --transport stdio ${name} -- ${server.command} ${server.args.join(" ")}`,
  );
}

console.log("\n=== scopes ===");
console.log("  -s local    (default) just you, this project");
console.log("  -s project  written to .mcp.json and committed - shared with the team");
console.log("  -s user     all your projects");

console.log("\n=== the equivalent .mcp.json ===");
const rendered = JSON.stringify({ mcpServers: SERVERS }, null, 2);
console.log(rendered);

if (process.argv.includes("--write")) {
  writeFileSync(MCP_JSON, `${rendered}\n`, "utf8");
  console.log(`\nwrote ${relative(REPO_ROOT, MCP_JSON)}`);
} else {
  console.log("\n(pass --write to write it into the repository)");
}

console.log("\n=== is Claude Code installed here? ===");
try {
  const version = execFileSync("claude", ["--version"], { encoding: "utf8" }).trim();
  console.log(`  yes: ${version}`);
  console.log("  try:  claude mcp list");
} catch {
  console.log("  not found on PATH. See lesson 58 for the native installer.");
}

console.log(
  "\nInside a session, `/mcp` lists connected servers, and the server's\n" +
    "prompts (lesson 55) appear as slash commands.\n\n" +
    "Note the other direction too: the MCP connector lets the Messages API\n" +
    "reach a REMOTE MCP server with no client of your own - but it cannot\n" +
    "reach a local stdio server, which is what this lesson configures.",
);
