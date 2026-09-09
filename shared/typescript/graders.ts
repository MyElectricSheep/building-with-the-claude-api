/**
 * Code-based graders (lesson 14). Pure, deterministic, free to run.
 *
 * Anthropic's evaluation guidance ranks graders in this order:
 *   code-based   - fast, deterministic, preferred wherever it is possible
 *   model-based  - for nuanced judgements, with an explicit rubric
 *   human        - flexible, slow, expensive
 *
 * Reach for a model judge only for what code cannot check.
 */
import type { GradeResult } from "./eval.ts";

/** Every listed field matches the expected value exactly. */
export function exactFields<TOutput, TExpected = TOutput>(
  fields: readonly (keyof TOutput & keyof TExpected & string)[],
): (output: TOutput, expected: TExpected) => GradeResult {
  return (output, expected) => {
    const wrong = fields.filter(
      (field) => output[field] !== (expected[field] as unknown),
    );
    return wrong.length === 0
      ? { score: 1, reason: "all fields match" }
      : {
          score: 1 - wrong.length / fields.length,
          reason: wrong
            .map(
              (field) =>
                `${field}: got ${JSON.stringify(output[field])}, want ${JSON.stringify(expected[field])}`,
            )
            .join(", "),
        };
  };
}

/** The text parses as JSON. */
export function isValidJson(text: string): GradeResult {
  try {
    JSON.parse(text);
    return { score: 1, reason: "parses" };
  } catch (error) {
    return {
      score: 0,
      reason: `not JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** The text matches a regular expression. */
export function matchesPattern(
  pattern: RegExp,
  label = "pattern",
): (output: string) => GradeResult {
  return (output) =>
    pattern.test(output)
      ? { score: 1, reason: `${label} matched` }
      : { score: 0, reason: `${label} did not match` };
}

/** Word count falls inside an inclusive range. */
export function withinWordCount(
  min: number,
  max: number,
): (output: string) => GradeResult {
  return (output) => {
    const words = output.trim().split(/\s+/).filter(Boolean).length;
    return words >= min && words <= max
      ? { score: 1, reason: `${words} words` }
      : { score: 0, reason: `${words} words, wanted ${min}-${max}` };
  };
}

/** None of the listed strings appears in the output (case-insensitive). */
export function avoidsPhrases(
  phrases: readonly string[],
): (output: string) => GradeResult {
  return (output) => {
    const lower = output.toLowerCase();
    const found = phrases.filter((phrase) => lower.includes(phrase.toLowerCase()));
    return found.length === 0
      ? { score: 1, reason: "no banned phrases" }
      : { score: 0, reason: `contains: ${found.join(", ")}` };
  };
}
