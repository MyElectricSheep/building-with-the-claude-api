/**
 * Lesson 2 - Getting an API key.
 *
 * A credential doctor. Reports what is configured without ever printing a secret.
 *
 *   npm run lesson -- 02
 */
import Anthropic from "@anthropic-ai/sdk";
import {
  EMBEDDING_MODEL,
  FAST_MODEL,
  MODEL,
} from "../../../shared/typescript/config.ts";

/** Show enough to identify a key, never enough to use it. */
function mask(value: string): string {
  if (value.length <= 12) return "*".repeat(value.length);
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function report(name: string, neededBy: string): boolean {
  const value = process.env[name];
  if (value) {
    console.log(`  [ok]      ${name.padEnd(20)} ${mask(value)}`);
    return true;
  }
  console.log(`  [missing] ${name.padEnd(20)} needed by ${neededBy}`);
  return false;
}

console.log("Credentials");
const hasAnthropic = report("ANTHROPIC_API_KEY", "almost every lesson");
report("VOYAGE_API_KEY", "lessons 34, 36, 38");

console.log("\nModel configuration");
console.log(`  CLAUDE_MODEL       ${MODEL}`);
console.log(`  CLAUDE_FAST_MODEL  ${FAST_MODEL}`);
console.log(`  VOYAGE_MODEL       ${EMBEDDING_MODEL}`);

console.log("\nConnectivity");
if (!hasAnthropic) {
  console.log("  skipped - no ANTHROPIC_API_KEY. Copy .env.example to .env.");
  console.log("  (An `ant auth login` profile also works; run `ant auth status`.)");
} else {
  try {
    const client = new Anthropic();
    const model = await client.models.retrieve(MODEL);
    console.log(`  [ok]      reached the API; ${model.id} is available`);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.log("  [fail]    the key was rejected (401). Check it in the Console.");
    } else if (error instanceof Anthropic.NotFoundError) {
      console.log(
        `  [fail]    ${MODEL} not found for this key. Set CLAUDE_MODEL in .env.`,
      );
    } else if (error instanceof Anthropic.APIConnectionError) {
      console.log(`  [fail]    could not reach the API: ${error.message}`);
    } else {
      throw error;
    }
  }
}
