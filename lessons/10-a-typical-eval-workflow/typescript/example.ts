/**
 * Lesson 10 - A typical eval workflow.
 *
 * Same dataset, two prompt versions, one diff. The diff is the deliverable: a
 * mean score that goes up while an individual case regresses is the most common
 * way an eval misleads you.
 *
 *   npm run lesson -- 10
 */
import { createClient } from "../../../shared/typescript/client.ts";
import { FAST_MODEL } from "../../../shared/typescript/config.ts";
import { formatReport, runEval } from "../../../shared/typescript/eval.ts";
import type { EvalReport } from "../../../shared/typescript/eval.ts";
import { exactFields } from "../../../shared/typescript/graders.ts";
import {
  PROMPT_V1,
  PROMPT_V2,
  loadCases,
  triage,
  type Triage,
} from "../../../shared/typescript/triage.ts";

const GRADED_FIELDS = ["category", "urgency", "has_order_id"] as const;

function scoreOf(report: EvalReport<Triage>, caseId: string): number | null {
  const result = report.results.find((entry) => entry.id === caseId);
  if (!result || result.error) return null;
  return result.grades.fields?.score ?? null;
}

const client = createClient();
const cases = loadCases();
const reports = new Map<string, EvalReport<Triage>>();

for (const [label, prompt] of [
  ["v1", PROMPT_V1],
  ["v2", PROMPT_V2],
] as const) {
  console.log(`=== prompt ${label} ===`);
  const report = await runEval({
    cases,
    run: (email) => triage(client, FAST_MODEL, prompt, email),
    graders: {
      fields: exactFields<Triage, Omit<Triage, "summary">>([...GRADED_FIELDS]),
    },
    concurrency: 3,
  });
  reports.set(label, report);
  console.log(formatReport(report, ["fields"]));
  console.log();
}

console.log("=== per-case diff (v1 -> v2) ===");
for (const testCase of cases) {
  const before = scoreOf(reports.get("v1")!, testCase.id);
  const after = scoreOf(reports.get("v2")!, testCase.id);
  let marker = "same";
  if (before === null || after === null) marker = "?";
  else if (after > before) marker = "FIXED";
  else if (after < before) marker = "REGRESSED";
  const show = (score: number | null) => (score === null ? "  n/a" : score.toFixed(2));
  console.log(
    `  ${testCase.id.padEnd(16)} ${show(before)} -> ${show(after)}   ${marker}`,
  );
}

const delta =
  reports.get("v2")!.meanScores.fields! - reports.get("v1")!.meanScores.fields!;
console.log(`\nmean delta: ${delta >= 0 ? "+" : ""}${delta.toFixed(3)}`);
console.log(
  `\nRecord what produced this number: prompt version, model (${FAST_MODEL}), ` +
    "dataset version, date. Otherwise the next run is not comparable.",
);
