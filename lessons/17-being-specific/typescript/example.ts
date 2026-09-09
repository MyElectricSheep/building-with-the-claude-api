/**
 * Lesson 17 - Being specific.
 *
 * One extraction task, three levels of specificity. Structured outputs removed a
 * whole category of prompt fiddling; what is left is judgement, ordering and
 * edge cases - and those still have to be said.
 *
 *   npm run lesson -- 17
 */
import { textOf } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { FAST_MODEL } from "../../../shared/typescript/config.ts";

const NOTE = `Standup, Tues 3 March 2026.
Ravi will ship the migration script - end of this week hopefully.
Someone needs to chase the vendor about the SSO cert, it expires the 19th.
Mei is on the flaky upload test, no date yet.
We agreed to revisit pricing at some point. Nobody owns that.`;

const LOOSE = "Extract the action items from this meeting note.";

const SPECIFIC = `Extract action items from this meeting note.

Return a JSON array. Each item has exactly:
  task      string, imperative, at most 12 words
  owner     string, or null if the note does not name a person
  due_date  string in YYYY-MM-DD, or null if no date is stated

Rules:
- The meeting is on 2026-03-03. Resolve relative dates against that.
- "end of this week" means the coming Friday.
- Never invent an owner or a date. Use null.
- Do not include items with no task.

Output only the JSON array.`;

const ITEM_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          task: { type: "string" },
          owner: { type: ["string", "null"] },
          due_date: { type: ["string", "null"] },
        },
        required: ["task", "owner", "due_date"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;

interface Item {
  task?: string;
  owner?: string | null;
  due_date?: string | null;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const PLACEHOLDERS = new Set(["someone", "nobody", "we"]);

function tryParse(raw: string): Item[] | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (Array.isArray(value)) return value as Item[];
  if (value !== null && typeof value === "object" && "items" in value) {
    const { items } = value as { items: unknown };
    if (Array.isArray(items)) return items as Item[];
  }
  return null;
}

function check(label: string, items: Item[] | null, raw: string): void {
  console.log(`--- ${label} ---`);
  if (items === null) {
    console.log("did not parse as a JSON array of objects:");
    console.log(`  ${raw.trim().slice(0, 200)}`);
    console.log("  FAIL  shape        unusable downstream\n");
    return;
  }

  console.log(JSON.stringify(items, null, 2));
  const keysOk = items.every(
    (item) => "task" in item && "owner" in item && "due_date" in item,
  );
  const datesOk = items.every(
    (item) => item.due_date === null || ISO.test(String(item.due_date)),
  );
  // "Nobody owns that" - the note names no person, so owner must be null.
  const invented = items
    .filter((item) => item.owner && PLACEHOLDERS.has(String(item.owner).toLowerCase()))
    .map((item) => item.task ?? "(no task)");

  console.log();
  console.log(`  ${keysOk ? "PASS" : "FAIL"}  required keys`);
  console.log(`  ${datesOk ? "PASS" : "FAIL"}  ISO-8601 dates`);
  console.log(
    `  ${invented.length === 0 ? "PASS" : "FAIL"}  no placeholder owners  [${invented.join(", ")}]`,
  );
  console.log();
}

const client = createClient();

for (const [label, prompt] of [
  ["loose", LOOSE],
  ["specific", SPECIFIC],
] as const) {
  const response = await client.messages.create({
    model: FAST_MODEL,
    max_tokens: 800,
    messages: [{ role: "user", content: `${prompt}\n\n<note>\n${NOTE}\n</note>` }],
  });
  const raw = textOf(response);
  check(label, tryParse(raw), raw);
}

const structured = await client.messages.create({
  model: FAST_MODEL,
  max_tokens: 800,
  messages: [{ role: "user", content: `${SPECIFIC}\n\n<note>\n${NOTE}\n</note>` }],
  output_config: { format: { type: "json_schema", schema: ITEM_SCHEMA } },
});
const structuredRaw = textOf(structured);
check("specific + schema", tryParse(structuredRaw), structuredRaw);

console.log(
  "The loose prompt usually produces something sensible with a shape that\n" +
    "changes between runs. Specificity fixes the semantics (null owners,\n" +
    "resolved dates); the schema fixes the shape.",
);
