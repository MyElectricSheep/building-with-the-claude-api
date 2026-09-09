/**
 * Lesson 7 - Response streaming.
 *
 * The SDK helper is still exactly what the course teaches. What is worth adding
 * in 2026 is that a stream carries more than text.
 *
 *   npm run lesson -- 07
 *   npm run lesson -- 07 -- --events
 */
import type Anthropic from "@anthropic-ai/sdk";
import { formatUsage } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";

const PROMPT = "Explain hybrid retrieval (dense + lexical) in about four sentences.";

const client = createClient();
const eventsOnly = process.argv.includes("--events");

async function streamText(): Promise<void> {
  console.log('--- on("text"): the 90% case ---');
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 500,
    messages: [{ role: "user", content: PROMPT }],
  });

  stream.on("text", (delta) => process.stdout.write(delta));

  // finalMessage() resolves the assembled Message. Never wrap .on() in a
  // new Promise() to do this yourself.
  const final = await stream.finalMessage();
  console.log(
    `\n\nstop_reason: ${final.stop_reason} | usage: ${formatUsage(final.usage)}`,
  );
}

async function streamEvents(): Promise<void> {
  console.log("\n--- raw events: what the text helper filters out ---");
  const counts = new Map<string, number>();

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 500,
    // Ask for readable reasoning so a thinking block actually appears.
    thinking: { type: "adaptive", display: "summarized" },
    messages: [{ role: "user", content: PROMPT }],
  });

  for await (const event of stream) {
    counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
    if (event.type === "content_block_start") {
      console.log(`\n[${event.content_block.type} block starts]`);
    } else if (event.type === "content_block_delta") {
      if (event.delta.type === "thinking_delta") {
        process.stdout.write(event.delta.thinking);
      } else if (event.delta.type === "text_delta") {
        process.stdout.write(event.delta.text);
      }
    }
  }

  const final: Anthropic.Message = await stream.finalMessage();

  console.log("\n\nevent census (wire names, not the lesson's PascalCase labels):");
  for (const [name, count] of [...counts].sort()) {
    console.log(`  ${name.padEnd(24)} ${count}`);
  }
  console.log(
    `\nstop_reason: ${final.stop_reason} | usage: ${formatUsage(final.usage)}`,
  );
}

if (!eventsOnly) await streamText();
await streamEvents();
