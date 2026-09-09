/**
 * Lesson 19 - Providing examples.
 *
 * Zero-shot vs few-shot vs specified, scored on the held-out split. Examples and
 * specification are two routes to the same place; which wins is empirical.
 *
 *   npm run lesson -- 19
 */
import { createClient } from "../../../shared/typescript/client.ts";
import { FAST_MODEL } from "../../../shared/typescript/config.ts";
import { runEval } from "../../../shared/typescript/eval.ts";
import { renderShots } from "../../../shared/typescript/examples.ts";
import { exactFields } from "../../../shared/typescript/graders.ts";
import {
  PROMPT_V1,
  PROMPT_V2,
  loadHeldOutCases,
  triage,
  type Triage,
} from "../../../shared/typescript/triage.ts";

const GRADED_FIELDS = ["category", "urgency", "has_order_id"] as const;

// Few-shot: the terse prompt plus four diverse examples. The examples sit before
// the variable input, which is also where prompt caching wants them (lesson 43).
const PROMPT_FEWSHOT = `${PROMPT_V1}\n\n${renderShots()}`;

const client = createClient();
const cases = loadHeldOutCases();

const prompts = {
  "zero-shot": PROMPT_V1,
  "few-shot": PROMPT_FEWSHOT,
  specified: PROMPT_V2,
};

console.log(`${cases.length} held-out cases | model ${FAST_MODEL}\n`);

for (const [label, prompt] of Object.entries(prompts)) {
  const report = await runEval({
    cases,
    run: (email) => triage(client, FAST_MODEL, prompt, email),
    graders: {
      fields: exactFields<Triage, Omit<Triage, "summary">>([...GRADED_FIELDS]),
    },
    concurrency: 2,
  });
  const wrong = report.results
    .filter((result) => result.error || (result.grades.fields?.score ?? 0) < 1)
    .map((result) => result.id);
  console.log(
    `${label.padEnd(12)} ${report.meanScores.fields!.toFixed(3)}   ` +
      `wrong: ${wrong.length > 0 ? wrong.join(", ") : "(none)"}`,
  );
}

console.log(
  "\nIf your examples exist only to show the JSON shape, delete them and use\n" +
    "output_config.format - cheaper, and a guarantee rather than a hint. Keep\n" +
    "examples for judgement: which category a borderline case belongs in.",
);
