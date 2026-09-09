/**
 * Lesson 3 - the Academy pattern, preserved for comparison.
 *
 * LEGACY. Do not copy this into new code.
 *
 * The last line only compiles because of the `@ts-expect-error` directive.
 * Delete that directive and run `npm run typecheck` to see what TypeScript
 * actually says about the Academy pattern:
 *
 *   error TS2339: Property 'text' does not exist on type 'ContentBlock'.
 *     Property 'text' does not exist on type 'ThinkingBlock'.
 *
 * That is the lesson: TypeScript catches the positional-access bug that Python
 * does not.
 *
 * Run it anyway (type stripping does not typecheck) to see the runtime shape:
 *
 *   npm run lesson -- 03 legacy
 */
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const message = await client.messages.create({
  model: "claude-sonnet-4-5", // LEGACY: superseded by claude-sonnet-5
  max_tokens: 1000,
  messages: [
    { role: "user", content: "What is quantum computing? Answer in one sentence." },
  ],
});

console.log("block types:", message.content.map((block) => block.type).join(", "));

// LEGACY: positional access. This is the line that does not compile.
// @ts-expect-error - ContentBlock is a union; 'text' is not on every member.
console.log(message.content[0].text);
