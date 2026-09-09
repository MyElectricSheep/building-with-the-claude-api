/**
 * Lesson 12 - Running the eval.
 *
 * The Academy's runPrompt / runTestCase / runEval decomposition is good. What a
 * 2026 runner adds: bounded concurrency, per-case error isolation, no
 * hand-rolled retries, and a refusal to score unreviewed data.
 *
 *   npm run lesson -- 12
 *   npm run lesson -- 12 -- --concurrency 1 --include-unreviewed
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { createClient } from "../../../shared/typescript/client.ts";
import { FAST_MODEL } from "../../../shared/typescript/config.ts";
import { formatReport, runEval } from "../../../shared/typescript/eval.ts";
import { exactFields } from "../../../shared/typescript/graders.ts";
import type { GeneratedCase } from "../../../shared/typescript/dataset.ts";
import {
  PROMPT_V2,
  loadCases,
  triage,
  type Triage,
  type TriageCase,
} from "../../../shared/typescript/triage.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const GENERATED_PATH = join(REPO_ROOT, "assets", "eval", "generated.json");
const GRADED_FIELDS = ["category", "urgency", "has_order_id"] as const;

/** Generated cases are candidates. Unreviewed ones are not a benchmark. */
function loadGenerated(includeUnreviewed: boolean): TriageCase[] {
  if (!existsSync(GENERATED_PATH)) return [];
  const payload = JSON.parse(readFileSync(GENERATED_PATH, "utf8")) as {
    cases?: GeneratedCase[];
  };
  const cases: TriageCase[] = [];
  let skipped = 0;
  for (const entry of payload.cases ?? []) {
    if (!entry.reviewed && !includeUnreviewed) {
      skipped += 1;
      continue;
    }
    cases.push({
      id: `gen:${entry.id}`,
      input: entry.input,
      expected: entry.expected as Omit<Triage, "summary">,
    });
  }
  if (skipped > 0) {
    console.log(
      `skipping ${skipped} unreviewed generated case(s) ` +
        "(pass --include-unreviewed to score them anyway)",
    );
  }
  return cases;
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    concurrency: { type: "string", default: "3" },
    "include-unreviewed": { type: "boolean", default: false },
  },
});

const concurrency = Number(values.concurrency);
const client = createClient();
const cases = [...loadCases(), ...loadGenerated(values["include-unreviewed"]!)];

console.log(
  `${cases.length} cases | model ${FAST_MODEL} | concurrency ${concurrency}\n`,
);

// No retry loop here on purpose: the SDK already retries 408/409/429/5xx with
// exponential backoff (maxRetries, default 2).
const report = await runEval({
  cases,
  run: (email) => triage(client, FAST_MODEL, PROMPT_V2, email),
  graders: {
    fields: exactFields<Triage, Omit<Triage, "summary">>([...GRADED_FIELDS]),
  },
  concurrency,
});

console.log(formatReport(report, ["fields"]));

console.log("\ntimings (ms)");
for (const result of report.results) {
  console.log(`  ${result.id.padEnd(24)} ${String(result.durationMs).padStart(6)}`);
}

if (report.errored > 0) {
  console.log(
    `\n${report.errored} case(s) errored. They are excluded from the mean: ` +
      "an errored case is not a failing case.",
  );
}
