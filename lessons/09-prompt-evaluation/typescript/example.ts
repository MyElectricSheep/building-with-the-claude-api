/**
 * Lesson 9 - Prompt evaluation.
 *
 * The smallest honest eval: a labelled dataset, one prompt, one code grader.
 * Everything in lessons 10-15 is this loop with more machinery around it.
 *
 *   npm run lesson -- 09
 */
import { createClient } from "../../../shared/typescript/client.ts";
import { FAST_MODEL } from "../../../shared/typescript/config.ts";
import { formatReport, runEval } from "../../../shared/typescript/eval.ts";
import { exactFields } from "../../../shared/typescript/graders.ts";
import {
  PROMPT_V2,
  loadCases,
  triage,
  type Triage,
} from "../../../shared/typescript/triage.ts";

const GRADED_FIELDS = ["category", "urgency", "has_order_id"] as const;

const client = createClient();
const cases = loadCases();

console.log(`${cases.length} cases, model ${FAST_MODEL}\n`);

const report = await runEval({
  cases,
  run: (email) => triage(client, FAST_MODEL, PROMPT_V2, email),
  // The dataset labels three fields; `summary` is graded by a model in
  // lesson 13, because no code grader can judge it.
  graders: {
    fields: exactFields<Triage, Omit<Triage, "summary">>([...GRADED_FIELDS]),
  },
  concurrency: 3,
});

console.log(formatReport(report, ["fields"]));
console.log(
  "\nThat number is the point. Change the prompt, re-run, compare.\n" +
    "Lesson 10 does exactly that.",
);
