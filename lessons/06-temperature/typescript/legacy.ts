/**
 * Lesson 6 - the Academy call, preserved.
 *
 * LEGACY / DEPRECATED. This does not work on current models and is here only to
 * show you exactly how it fails.
 *
 * Unlike the Python SDK, the TypeScript SDK still carries `temperature` in its
 * request types for backwards compatibility - so this file COMPILES. The
 * rejection happens at the API, as a 400.
 *
 *   npm run lesson -- 06 legacy
 */
import Anthropic from "@anthropic-ai/sdk";
import { MODEL } from "../../../shared/typescript/config.ts";

const client = new Anthropic();

console.log(
  "Calling messages.create({ ..., temperature: 0.2 }) on a current model...\n",
);

try {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 100,
    temperature: 0.2, // LEGACY: deprecated as of Claude Opus 4.7
    messages: [{ role: "user", content: "Name a colour." }],
  });
  console.log("Unexpected success:", message.stop_reason);
  console.log(
    "This model still accepts sampling parameters - it predates Claude 4.7. " +
      "The deprecation is scoped to 4.7 and later, not retroactive.",
  );
} catch (error) {
  if (error instanceof Anthropic.BadRequestError) {
    console.log(`400 from the API: ${error.message}`);
    console.log(
      "\nThis is the current behaviour. `temperature`, `top_p` and `top_k` are\n" +
        "deprecated as of Claude Opus 4.7. See example.ts for the prompting-based\n" +
        "replacement.",
    );
  } else {
    throw error;
  }
}
