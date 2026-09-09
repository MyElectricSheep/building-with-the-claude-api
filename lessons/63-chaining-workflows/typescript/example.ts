/**
 * Lesson 63 - Chaining, with real gates between the stages.
 *
 * The reason chaining beats one big prompt is not focus - it is that you can put
 * CODE between the stages. A gate failing stops the chain and says which one.
 *
 *   npm run lesson -- 63
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseStructured, textOf } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { FAST_MODEL, MODEL } from "../../../shared/typescript/config.ts";
import { avoidsPhrases, withinWordCount } from "../../../shared/typescript/graders.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const NOTES = readFileSync(join(REPO_ROOT, "assets", "data", "incident.md"), "utf8");
const TIME = /^\d{2}:\d{2}$/;

interface Gate {
  ok: boolean;
  reason: string;
}
interface Facts {
  events: { at: string; what: string }[];
  service: string;
}
interface Severity {
  severity: string;
  reason: string;
}
interface Actions {
  actions: { action: string; owner_role: string }[];
}

const FACTS_SCHEMA = {
  type: "object",
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        properties: { at: { type: "string" }, what: { type: "string" } },
        required: ["at", "what"],
        additionalProperties: false,
      },
    },
    service: { type: "string" },
  },
  required: ["events", "service"],
  additionalProperties: false,
} as const;

const SEVERITY_SCHEMA = {
  type: "object",
  properties: {
    severity: { type: "string", enum: ["SEV1", "SEV2", "SEV3"] },
    reason: { type: "string" },
  },
  required: ["severity", "reason"],
  additionalProperties: false,
} as const;

const ACTIONS_SCHEMA = {
  type: "object",
  properties: {
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          owner_role: { type: "string" },
        },
        required: ["action", "owner_role"],
        additionalProperties: false,
      },
    },
  },
  required: ["actions"],
  additionalProperties: false,
} as const;

/** Every timestamp must be HH:MM. A schema cannot express that. */
function gateFacts(facts: Facts): Gate {
  const bad = facts.events.filter((event) => !TIME.test(event.at)).map((e) => e.at);
  if (bad.length > 0) {
    return { ok: false, reason: `timestamps not in HH:MM: ${bad.join(", ")}` };
  }
  if (facts.events.length < 4) {
    return { ok: false, reason: `only ${facts.events.length} events extracted` };
  }
  return { ok: true, reason: `${facts.events.length} events, all HH:MM` };
}

/** A SEV1 must be justified - business rule, not a schema rule. */
function gateSeverity(verdict: Severity): Gate {
  if (verdict.severity === "SEV1" && verdict.reason.split(/\s+/).length < 5) {
    return { ok: false, reason: "SEV1 declared without a stated reason" };
  }
  return { ok: true, reason: `${verdict.severity}: ${verdict.reason.slice(0, 60)}` };
}

function gateDraft(draft: string): Gate {
  const length = withinWordCount(120, 400)(draft);
  if (length.score < 1) return { ok: false, reason: length.reason };
  const filler = avoidsPhrases(["as an AI", "lessons learned", "moving forward"])(
    draft,
  );
  if (filler.score < 1) return { ok: false, reason: filler.reason };
  return { ok: true, reason: length.reason };
}

function gateActions(payload: Actions): Gate {
  if (payload.actions.length < 2) {
    return { ok: false, reason: `only ${payload.actions.length} action(s)` };
  }
  const unowned = payload.actions
    .filter((entry) => entry.owner_role.trim().length === 0)
    .map((entry) => entry.action);
  if (unowned.length > 0) {
    return { ok: false, reason: `actions with no owner role: ${unowned.join(", ")}` };
  }
  return { ok: true, reason: `${payload.actions.length} actions, all owned` };
}

const client = createClient();

function stage(number: number, name: string, gate: Gate): boolean {
  console.log(
    `  [${gate.ok ? "ok  " : "STOP"}] stage ${number} ${name.padEnd(18)} ${gate.reason}`,
  );
  return gate.ok;
}

console.log(`four-stage chain, gates between every stage (model ${FAST_MODEL})\n`);

// Stage 1: extract.
const factsResponse = await client.messages.create({
  model: FAST_MODEL,
  max_tokens: 1200,
  system: "Extract the incident timeline. Times exactly as written, HH:MM.",
  messages: [{ role: "user", content: `<notes>\n${NOTES}\n</notes>` }],
  output_config: { format: { type: "json_schema", schema: FACTS_SCHEMA } },
});
const facts = parseStructured<Facts>(factsResponse);
if (!stage(1, "extract facts", gateFacts(facts))) process.exit(0);

// Stage 2: classify. Input is the PREVIOUS STAGE'S DATA, not the raw notes.
const severityResponse = await client.messages.create({
  model: FAST_MODEL,
  max_tokens: 400,
  system:
    "Assign a severity. SEV1: unusable or money at risk. SEV2: a major feature " +
    "broken. SEV3: degraded but usable. Justify it in one sentence naming the " +
    "evidence.",
  messages: [{ role: "user", content: JSON.stringify(facts) }],
  output_config: { format: { type: "json_schema", schema: SEVERITY_SCHEMA } },
});
const verdict = parseStructured<Severity>(severityResponse);
if (!stage(2, "classify severity", gateSeverity(verdict))) process.exit(0);

// Stage 3: draft.
const draftResponse = await client.messages.create({
  model: FAST_MODEL,
  max_tokens: 1200,
  system:
    "Write a blameless retrospective from these facts. 120-400 words. No filler " +
    "phrases, no 'lessons learned' heading.",
  messages: [{ role: "user", content: JSON.stringify({ facts, severity: verdict }) }],
});
const draft = textOf(draftResponse).trim();
if (!stage(3, "draft retro", gateDraft(draft))) process.exit(0);

// Stage 4: actions. The one stage worth the stronger model.
const actionsResponse = await client.messages.create({
  model: MODEL,
  max_tokens: 800,
  system:
    "Propose specific follow-up actions. Each names a role that owns it. No " +
    "action may be 'improve monitoring' or similar - be concrete.",
  messages: [{ role: "user", content: draft }],
  output_config: { format: { type: "json_schema", schema: ACTIONS_SCHEMA } },
});
const payload = parseStructured<Actions>(actionsResponse);
if (!stage(4, "propose actions", gateActions(payload))) process.exit(0);

console.log("\n=== retrospective ===\n");
console.log(draft);
console.log("\n=== actions ===");
for (const entry of payload.actions) {
  console.log(`  [${entry.owner_role}] ${entry.action}`);
}

console.log(
  "\nThe gates are the point. A single prompt cannot refuse to continue,\n" +
    "and it cannot apply a business rule that no schema can express.\n\n" +
    "For a chain of TOOL calls specifically, programmatic tool calling can\n" +
    "collapse the round trips inside one turn - see the README. It does not\n" +
    "replace this.",
);
