/**
 * Lesson 13 - the Academy's grader prompt, preserved.
 *
 * LEGACY. The Python lesson has a real interpolation bug: `eval_prompt` is a
 * plain triple-quoted string containing {task} and {solution}, which Python does
 * not interpolate. The judge receives the literal braces.
 *
 * TypeScript has no equivalent trap - a template literal always interpolates,
 * and a plain string with ${...} in it is a syntax the compiler notices. This
 * file shows both halves so the Python bug is legible from the TS side.
 *
 * It also shows the second Academy problem: prefilling "```json" to force JSON
 * from the judge, which returns a 400 on current models (see lesson 8).
 *
 * No API call, no cost.
 *
 *   npm run lesson -- 13 legacy
 */
const task = "Summarise the support email in one sentence.";
const solution =
  "Customer was charged twice for order #A-77210 and needs a refund today.";

// The Python equivalent of this, WITHOUT the f prefix, is what the lesson ships.
const notInterpolated =
  "\nEvaluate this solution.\nTask: {task}\nSolution: {solution}\n";

const interpolated = `
Evaluate this solution.
Task: ${task}
Solution: ${solution}
`;

console.log("--- as rendered in the lesson (Python, no f prefix) ---");
console.log(notInterpolated);
console.log("--- interpolated ---");
console.log(interpolated);
console.log(
  "The first prompt sends the judge the literal text '{task}'.\n" +
    "example.ts goes further and serialises the values as JSON, so a support\n" +
    "email containing instructions is graded rather than obeyed.\n\n" +
    "The lesson's other pattern - prefilling '```json' onto the judge turn to\n" +
    "force JSON - now returns a 400. Use output_config.format instead.",
);
