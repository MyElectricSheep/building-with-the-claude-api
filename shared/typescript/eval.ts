/**
 * A minimal evaluation harness for lessons 9-15.
 *
 * The Academy introduces a `PromptEvaluator` helper. That is *course
 * scaffolding*, not part of the Claude SDK - a point the lesson does not make
 * clearly enough. Everything here is ordinary application code you could delete
 * and rewrite in an afternoon. Nothing in this file is an API feature.
 *
 * The pure pieces (bounded concurrency, scoring, reporting) are unit tested and
 * run with no credentials.
 */

export interface EvalCase<TInput = string, TExpected = unknown> {
  id: string;
  input: TInput;
  expected: TExpected;
}

export interface GradeResult {
  /** 0..1. Use 0/1 for a pass/fail grader. */
  score: number;
  /** Why. Shown in the report; keep it short. */
  reason: string;
}

export interface CaseResult<TOutput = unknown> {
  id: string;
  output: TOutput | null;
  grades: Record<string, GradeResult>;
  error?: string;
  /** Wall-clock milliseconds for the model call. */
  durationMs: number;
}

export interface EvalReport<TOutput = unknown> {
  results: CaseResult<TOutput>[];
  /** Mean score per grader, over cases that produced output. */
  meanScores: Record<string, number>;
  passed: number;
  failed: number;
  errored: number;
}

/**
 * Map with bounded concurrency.
 *
 * Evals fan out; rate limits do not. Five in flight is a sane default for a
 * teaching repository - raise it once you know your tier's limits.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (limit < 1) throw new Error("limit must be >= 1");
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]!, index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

export type Grader<TOutput, TExpected> = (
  output: TOutput,
  expected: TExpected,
  input: unknown,
) => GradeResult | Promise<GradeResult>;

export interface RunEvalOptions<TInput, TExpected, TOutput> {
  cases: readonly EvalCase<TInput, TExpected>[];
  /** The thing under test. One model call, usually. */
  run: (input: TInput) => Promise<TOutput>;
  graders: Record<string, Grader<TOutput, TExpected>>;
  concurrency?: number;
}

export async function runEval<TInput, TExpected, TOutput>({
  cases,
  run,
  graders,
  concurrency = 5,
}: RunEvalOptions<TInput, TExpected, TOutput>): Promise<EvalReport<TOutput>> {
  const results = await mapWithConcurrency(cases, concurrency, async (testCase) => {
    const startedAt = Date.now();
    try {
      const output = await run(testCase.input);
      const grades: Record<string, GradeResult> = {};
      for (const [name, grader] of Object.entries(graders)) {
        grades[name] = await grader(output, testCase.expected, testCase.input);
      }
      return {
        id: testCase.id,
        output,
        grades,
        durationMs: Date.now() - startedAt,
      } satisfies CaseResult<TOutput>;
    } catch (error) {
      return {
        id: testCase.id,
        output: null,
        grades: {},
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt,
      } satisfies CaseResult<TOutput>;
    }
  });

  return summarise(results, Object.keys(graders));
}

/** Turn raw case results into a report. Pure - unit tested without credentials. */
export function summarise<TOutput>(
  results: CaseResult<TOutput>[],
  graderNames: string[],
): EvalReport<TOutput> {
  const graded = results.filter((result) => result.error === undefined);
  const meanScores: Record<string, number> = {};

  for (const name of graderNames) {
    const scores = graded
      .map((result) => result.grades[name]?.score)
      .filter((score): score is number => typeof score === "number");
    meanScores[name] =
      scores.length === 0
        ? 0
        : scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  // A case "passes" when every grader gave it a full score.
  const passed = graded.filter((result) =>
    graderNames.every((name) => (result.grades[name]?.score ?? 0) >= 1),
  ).length;

  return {
    results,
    meanScores,
    passed,
    failed: graded.length - passed,
    errored: results.length - graded.length,
  };
}

/** Render a report as a fixed-width table. */
export function formatReport<TOutput>(
  report: EvalReport<TOutput>,
  graderNames: string[],
): string {
  const lines: string[] = [];
  const idWidth = Math.max(4, ...report.results.map((r) => r.id.length));

  lines.push(
    "case".padEnd(idWidth) +
      graderNames.map((name) => `  ${name.padStart(12)}`).join("") +
      "   notes",
  );
  lines.push("-".repeat(idWidth + graderNames.length * 14 + 30));

  for (const result of report.results) {
    if (result.error) {
      lines.push(
        `${result.id.padEnd(idWidth)}${"  ERROR".padStart(14)}   ${result.error}`,
      );
      continue;
    }
    const scores = graderNames
      .map((name) => (result.grades[name]?.score ?? 0).toFixed(2).padStart(14))
      .join("");
    const notes = graderNames
      .map((name) => result.grades[name]?.reason)
      .filter((reason): reason is string => Boolean(reason))
      .join("; ");
    lines.push(`${result.id.padEnd(idWidth)}${scores}   ${notes}`);
  }

  lines.push("");
  for (const name of graderNames) {
    lines.push(`mean ${name}: ${report.meanScores[name]!.toFixed(3)}`);
  }
  lines.push(
    `passed ${report.passed} / failed ${report.failed} / errored ${report.errored}`,
  );
  return lines.join("\n");
}
