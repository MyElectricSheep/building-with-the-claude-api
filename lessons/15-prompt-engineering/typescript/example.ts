/**
 * Lesson 15 - Prompt engineering as a measured loop.
 *
 * Two prompts, two splits, one 2x2. A prompt that improves on train and
 * collapses on held-out was fitted to the training set - that is what this
 * lesson exists to make visible.
 *
 * `PromptEvaluator` is course scaffolding, not an SDK feature. The harness this
 * uses (shared/typescript/eval.ts) is ~150 lines of ordinary application code.
 *
 *   npm run lesson -- 15
 */
import { createClient } from "../../../shared/typescript/client.ts";
import { FAST_MODEL } from "../../../shared/typescript/config.ts";
import { runEval } from "../../../shared/typescript/eval.ts";
import { exactFields } from "../../../shared/typescript/graders.ts";
import {
  PROMPT_V1,
  PROMPT_V2,
  loadCases,
  loadHeldOutCases,
  triage,
  type Triage,
} from "../../../shared/typescript/triage.ts";

const GRADED_FIELDS = ["category", "urgency", "has_order_id"] as const;

const client = createClient();
const splits = { train: loadCases(), "held-out": loadHeldOutCases() };
const prompts = { v1: PROMPT_V1, v2: PROMPT_V2 };

const scores = new Map<string, number>();
const failures = new Map<string, string[]>();

for (const [promptLabel, prompt] of Object.entries(prompts)) {
  for (const [splitLabel, cases] of Object.entries(splits)) {
    const report = await runEval({
      cases,
      run: (email) => triage(client, FAST_MODEL, prompt, email),
      graders: {
        fields: exactFields<Triage, Omit<Triage, "summary">>([...GRADED_FIELDS]),
      },
      concurrency: 3,
    });
    const key = `${promptLabel}/${splitLabel}`;
    scores.set(key, report.meanScores.fields!);
    failures.set(
      key,
      report.results
        .filter((result) => result.error || (result.grades.fields?.score ?? 0) < 1)
        .map((result) => result.id),
    );
  }
}

console.log(`model ${FAST_MODEL}\n`);
console.log(`${"".padEnd(12)}${"train".padStart(10)}${"held-out".padStart(12)}`);
for (const promptLabel of Object.keys(prompts)) {
  const train = scores.get(`${promptLabel}/train`)!;
  const held = scores.get(`${promptLabel}/held-out`)!;
  console.log(
    `prompt ${promptLabel.padEnd(5)}${train.toFixed(3).padStart(10)}${held
      .toFixed(3)
      .padStart(12)}`,
  );
}

console.log("\ncases still wrong");
for (const [key, ids] of failures) {
  console.log(`  ${key.padEnd(14)} ${ids.length > 0 ? ids.join(", ") : "(none)"}`);
}

const trainDelta = scores.get("v2/train")! - scores.get("v1/train")!;
const heldDelta = scores.get("v2/held-out")! - scores.get("v1/held-out")!;
const sign = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
console.log(`\nv1 -> v2   train ${sign(trainDelta)}   held-out ${sign(heldDelta)}`);

if (trainDelta > 0 && heldDelta <= 0) {
  console.log(
    "\nTrain improved, held-out did not. That is a prompt fitted to the\n" +
      "training set. The held-out number is the one that predicts anything.",
  );
} else {
  console.log(
    "\nThe improvement generalised. Now change ONE more thing and repeat -\n" +
      "and record the prompt version, model and dataset version with the score.",
  );
}
