/**
 * Lesson 14 - Code based grading.
 *
 * Runs entirely locally. No API key, no network, no cost - which is the point:
 * code graders are free, so use them for everything they can cover.
 *
 *   npm run lesson -- 14
 */
import type { GradeResult } from "../../../shared/typescript/eval.ts";
import {
  avoidsPhrases,
  exactFields,
  isValidJson,
  matchesPattern,
  withinWordCount,
} from "../../../shared/typescript/graders.ts";

// Pre-baked "model outputs", including the failure modes you actually see.
const SAMPLES = {
  cleanJson: '{"category":"billing","urgency":"high"}',
  chattyJson: 'Sure! Here is your JSON:\n{"category":"billing"}',
  isoDate: "2026-09-09",
  proseDate: "the ninth of September",
  rightLength: "Customer was double-charged and needs a refund today.",
  tooLong: Array.from({ length: 40 }, () => "word").join(" "),
  noFiller: "Refund the duplicate charge on order A-77210.",
  filler: "As an AI language model, I would suggest issuing a refund.",
};

function show(label: string, result: GradeResult): void {
  const mark = result.score >= 1 ? "PASS" : "FAIL";
  console.log(
    `  ${mark}  ${label.padEnd(16)} score ${result.score.toFixed(2)}  ${result.reason}`,
  );
}

console.log("isValidJson - the classic: did we get JSON or a sentence?");
show("clean json", isValidJson(SAMPLES.cleanJson));
show("chatty json", isValidJson(SAMPLES.chattyJson));
console.log(
  "    With output_config.format the 'chatty json' failure mode stops\n" +
    "    happening at all - see lesson 8.\n",
);

console.log("matchesPattern - shape checks");
const iso = matchesPattern(/^\d{4}-\d{2}-\d{2}$/, "ISO date");
show("iso date", iso(SAMPLES.isoDate));
show("prose date", iso(SAMPLES.proseDate));
console.log();

console.log("withinWordCount - length bounds");
const brief = withinWordCount(5, 20);
show("right length", brief(SAMPLES.rightLength));
show("too long", brief(SAMPLES.tooLong));
console.log();

console.log("avoidsPhrases - banned filler");
const noFiller = avoidsPhrases(["as an AI", "I cannot", "certainly!"]);
show("no filler", noFiller(SAMPLES.noFiller));
show("filler", noFiller(SAMPLES.filler));
console.log();

console.log("exactFields - partial credit across labelled fields");
interface Labels {
  category: string;
  urgency: string;
  has_order_id: boolean;
}
const grade = exactFields<Labels>(["category", "urgency", "has_order_id"]);
const expected: Labels = {
  category: "billing",
  urgency: "high",
  has_order_id: true,
};
show("all correct", grade({ ...expected }, expected));
show("one wrong", grade({ ...expected, urgency: "low" }, expected));
show(
  "all wrong",
  grade({ category: "bug", urgency: "low", has_order_id: false }, expected),
);

console.log(
  "\nPython additionally has `is_valid_python` (ast.parse - syntax only, nothing\n" +
    "is executed). TypeScript has no standard-library equivalent, so that grader\n" +
    "is Python-only. To grade behaviour you need a sandbox - see lesson 46.\n\n" +
    "Every grader above has unit tests in shared/typescript/eval.test.ts.\n" +
    "A grader that silently returns 1.0 for everything is worse than no grader,\n" +
    "so test the tests.",
);
