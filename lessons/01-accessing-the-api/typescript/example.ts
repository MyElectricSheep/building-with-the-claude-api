/**
 * Lesson 1 - Accessing the API.
 *
 * Verify access without spending output tokens: list the models the key can reach.
 *
 *   npm run lesson -- 01
 */
import { createClient } from "../../../shared/typescript/client.ts";
import { FAST_MODEL, MODEL } from "../../../shared/typescript/config.ts";

/**
 * Does a configured model id match a listed one?
 *
 * The Models API returns a dated id for some models (`claude-haiku-4-5-20251001`)
 * while the documented id you write in code is undated (`claude-haiku-4-5`).
 * Both work - the undated form resolves to the dated one - so an exact-match
 * check reports a working model as missing.
 */
function isAvailable(configured: string, available: readonly string[]): boolean {
  return available.some((id) => id === configured || id.startsWith(`${configured}-`));
}

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
for (const [variable, configured] of [
  ["CLAUDE_MODEL", MODEL],
  ["CLAUDE_FAST_MODEL", FAST_MODEL],
] as const) {
  if (isAvailable(configured, available)) {
    console.log(`${variable}=${configured} is available to this key.`);
  } else {
    console.log(
      `${variable}=${configured} was NOT listed for this key. ` +
        `Pick one of the ids above and set ${variable} in .env.`,
    );
  }
}
