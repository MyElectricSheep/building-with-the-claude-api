/**
 * Lesson 1 - Accessing the API.
 *
 * Verify access without spending output tokens: list the models the key can reach.
 *
 *   npm run lesson -- 01
 */
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";

const client = createClient();

console.log(
  `${"model id".padEnd(28)} ${"context".padStart(10)} ${"max output".padStart(11)}  display name`,
);
console.log("-".repeat(78));

const available: string[] = [];
// The SDK auto-paginates: iterate the pager, don't index into `.data`.
for await (const model of client.models.list()) {
  available.push(model.id);
  const context = model.max_input_tokens;
  const output = model.max_tokens;
  console.log(
    `${model.id.padEnd(28)} ` +
      `${(context ? context.toLocaleString("en-US") : "-").padStart(10)} ` +
      `${(output ? output.toLocaleString("en-US") : "-").padStart(11)}  ` +
      `${model.display_name}`,
  );
}

console.log();
if (available.includes(MODEL)) {
  console.log(`CLAUDE_MODEL=${MODEL} is available to this key.`);
} else {
  console.log(
    `CLAUDE_MODEL=${MODEL} was NOT listed for this key.\n` +
      `Pick one of the ids above and set CLAUDE_MODEL in .env.`,
  );
}
