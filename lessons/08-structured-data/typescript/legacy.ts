/**
 * Lesson 8 - the Academy's prefill + stop_sequences technique, preserved.
 *
 * LEGACY / UNSUPPORTED. A final prefilled assistant turn returns HTTP 400 on
 * Claude Sonnet 5, Opus 5, Opus 4.6/4.7/4.8, Sonnet 4.6 and the Fable family.
 *
 * Note what is NOT deprecated here:
 *   - complete prior assistant turns are still fine (that is lesson 4);
 *   - `stop_sequences` itself is still a supported parameter.
 *
 * Only the trailing *partial* assistant prefill is gone.
 *
 *   npm run lesson -- 08 legacy
 */
import Anthropic from "@anthropic-ai/sdk";
import { MODEL } from "../../../shared/typescript/config.ts";

const client = new Anthropic();

console.log(`Sending a trailing assistant prefill to ${MODEL}...\n`);

try {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    messages: [
      { role: "user", content: "Generate a very short EventBridge rule as JSON" },
      // LEGACY: the prefill. This is the turn that is now rejected.
      { role: "assistant", content: "```json" },
    ],
    stop_sequences: ["```"],
  });
  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  console.log("Unexpected success - this model still accepts prefill:");
  console.log(text);
  console.log(
    "\n(Prefill is rejected from Claude 4.6 onward. Set CLAUDE_MODEL to a\n" +
      "current model to see the 400.)",
  );
} catch (error) {
  if (error instanceof Anthropic.BadRequestError) {
    console.log(`400 from the API: ${error.message}`);
    console.log(
      "\nThis is the current behaviour. Replace the whole technique with\n" +
        "structured outputs - see example.ts.",
    );
  } else {
    throw error;
  }
}
