/**
 * Lesson 5 - System prompts.
 *
 * `system` is a top-level parameter, not a message. Same question, two system
 * prompts, visibly different answers - then the block form used for caching.
 *
 *   npm run lesson -- 05
 */
import type Anthropic from "@anthropic-ai/sdk";
import { textOf } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";

const QUESTION = "How should I store user passwords?";

const PERSONAS: Record<string, string> = {
  "terse security reviewer":
    "You are a security reviewer. Answer in at most two sentences. " +
    "State the recommendation and the single most important pitfall. No preamble.",
  "patient teacher":
    "You are teaching a developer who has never shipped authentication. " +
    "Explain the reasoning before the recommendation, in about four sentences.",
};

const client = createClient();

for (const [label, system] of Object.entries(PERSONAS)) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system,
    messages: [{ role: "user", content: QUESTION }],
  });
  console.log(`--- ${label} ---`);
  console.log(textOf(response));
  console.log();
}

// The block form. Identical semantics; this is what lesson 43 attaches a cache
// breakpoint to.
const systemBlocks: Anthropic.TextBlockParam[] = [
  {
    type: "text",
    text: PERSONAS["terse security reviewer"]!,
    cache_control: { type: "ephemeral" },
  },
];

const cached = await client.messages.create({
  model: MODEL,
  max_tokens: 200,
  system: systemBlocks,
  messages: [{ role: "user", content: QUESTION }],
});

console.log("--- same prompt, block form with a cache breakpoint ---");
console.log(textOf(cached));
console.log(
  `\ncache write: ${cached.usage.cache_creation_input_tokens} tokens` +
    ` | cache read: ${cached.usage.cache_read_input_tokens} tokens`,
);
console.log(
  "A short system prompt like this is usually below the model's minimum " +
    "cacheable prefix, so expect both counters to be 0. Lesson 43 uses a " +
    "prompt large enough to actually cache.",
);
