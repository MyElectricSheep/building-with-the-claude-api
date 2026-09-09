/**
 * Lesson 43 - Prompt caching.
 *
 * Watch a cache write on request 1 become reads on 2 and 3 - then watch a
 * timestamp in the system prompt destroy it. Sending cache_control is not
 * evidence of a cache hit; usage is.
 *
 *   npm run lesson -- 43
 */
import { textOf } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";
import { loadCorpus } from "../../../shared/typescript/corpus.ts";

const QUESTIONS = [
  "What is the deadline for an incident retrospective?",
  "How much can I spend on dinner while travelling, without approval?",
  "When does the on-call handover happen?",
];

/**
 * Large enough to clear the minimum cacheable prefix (1024-4096 tokens, model
 * dependent). A short system prompt silently does not cache.
 */
function bigSystemPrompt(): string {
  const corpus = loadCorpus()
    .map((doc) => `# ${doc.name}\n${doc.text}`)
    .join("\n\n");
  // Repeat to comfortably exceed the threshold on any current model.
  const body = `${corpus}\n\n`.repeat(4);
  return (
    "You are an internal handbook assistant. Answer only from the handbook " +
    `below, in one sentence.\n\n<handbook>\n${body}</handbook>`
  );
}

const client = createClient();
const system = bigSystemPrompt();

const sized = await client.messages.countTokens({
  model: MODEL,
  system,
  messages: [{ role: "user", content: "x" }],
});
console.log(`system prompt: ~${sized.input_tokens} tokens\n`);

console.log("--- stable prefix ---");
for (const [index, question] of QUESTIONS.entries()) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    // One line. Claude places the breakpoint at the last cacheable block and
    // moves it forward as the conversation grows.
    cache_control: { type: "ephemeral" },
    system,
    messages: [{ role: "user", content: question }],
  });
  const { usage } = response;
  console.log(
    `  ${index + 1}. write ${String(usage.cache_creation_input_tokens ?? 0).padStart(6)}  ` +
      `read ${String(usage.cache_read_input_tokens ?? 0).padStart(6)}  ` +
      `uncached ${String(usage.input_tokens).padStart(5)}   ` +
      `${textOf(response).trim().slice(0, 52)}`,
  );
}
console.log();

// The single most common silent invalidator. Nothing errors; the cache just
// never hits, and the bill never goes down.
console.log("--- the same requests, with a timestamp in the system prompt ---");
for (const [index, question] of QUESTIONS.entries()) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    cache_control: { type: "ephemeral" },
    system: `Current time: ${new Date().toISOString()}\n\n${system}`,
    messages: [{ role: "user", content: question }],
  });
  const { usage } = response;
  console.log(
    `  ${index + 1}. write ${String(usage.cache_creation_input_tokens ?? 0).padStart(6)}  ` +
      `read ${String(usage.cache_read_input_tokens ?? 0).padStart(6)}  ` +
      `uncached ${String(usage.input_tokens).padStart(5)}`,
  );
}

console.log(
  "\nRender order is tools -> system -> messages, and caching is a PREFIX\n" +
    "match: one changed byte early invalidates everything after it. A\n" +
    "datetime, a UUID, or a tool list built from an unordered set will all\n" +
    "do this. Nothing errors - cache_read_input_tokens just stays at 0.",
);
