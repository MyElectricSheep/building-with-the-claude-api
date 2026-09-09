import { test } from "node:test";
import assert from "node:assert/strict";
import { formatReport, mapWithConcurrency, summarise } from "./eval.ts";
import type { CaseResult } from "./eval.ts";
import {
  avoidsPhrases,
  exactFields,
  isValidJson,
  matchesPattern,
  withinWordCount,
} from "./graders.ts";

test("mapWithConcurrency preserves input order", async () => {
  const out = await mapWithConcurrency([5, 1, 3], 2, async (n) => {
    await new Promise((resolve) => setTimeout(resolve, n));
    return n * 2;
  });
  assert.deepEqual(out, [10, 2, 6]);
});

test("mapWithConcurrency never exceeds the limit", async () => {
  let inFlight = 0;
  let peak = 0;
  await mapWithConcurrency(
    Array.from({ length: 12 }, (_, i) => i),
    3,
    async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 2));
      inFlight -= 1;
      return null;
    },
  );
  assert.ok(peak <= 3, `peak concurrency was ${peak}`);
});

test("mapWithConcurrency rejects a limit below 1", async () => {
  await assert.rejects(() => mapWithConcurrency([1], 0, async () => 1), /limit/);
});

test("mapWithConcurrency handles an empty input", async () => {
  assert.deepEqual(await mapWithConcurrency([], 4, async () => 1), []);
});

test("summarise separates errors from failures", () => {
  const results: CaseResult<string>[] = [
    { id: "a", output: "x", grades: { g: { score: 1, reason: "" } }, durationMs: 1 },
    { id: "b", output: "y", grades: { g: { score: 0, reason: "" } }, durationMs: 1 },
    { id: "c", output: null, grades: {}, error: "boom", durationMs: 1 },
  ];
  const report = summarise(results, ["g"]);
  assert.equal(report.passed, 1);
  assert.equal(report.failed, 1);
  assert.equal(report.errored, 1);
  // The errored case must not drag the mean down - it was never graded.
  assert.equal(report.meanScores.g, 0.5);
});

test("summarise reports 0 when nothing was graded", () => {
  const report = summarise(
    [{ id: "a", output: null, grades: {}, error: "x", durationMs: 0 }],
    ["g"],
  );
  assert.equal(report.meanScores.g, 0);
  assert.equal(report.errored, 1);
});

test("formatReport renders every case", () => {
  const report = summarise(
    [
      {
        id: "alpha",
        output: "x",
        grades: { g: { score: 1, reason: "ok" } },
        durationMs: 1,
      },
      { id: "b", output: null, grades: {}, error: "boom", durationMs: 1 },
    ],
    ["g"],
  );
  const text = formatReport(report, ["g"]);
  assert.match(text, /alpha/);
  assert.match(text, /ERROR/);
  assert.match(text, /mean g: 1\.000/);
});

test("exactFields scores partial matches proportionally", () => {
  const grade = exactFields<{ a: string; b: string }>(["a", "b"]);
  assert.equal(grade({ a: "1", b: "2" }, { a: "1", b: "2" }).score, 1);
  assert.equal(grade({ a: "1", b: "9" }, { a: "1", b: "2" }).score, 0.5);
  assert.equal(grade({ a: "8", b: "9" }, { a: "1", b: "2" }).score, 0);
});

test("isValidJson distinguishes JSON from prose", () => {
  assert.equal(isValidJson('{"a":1}').score, 1);
  assert.equal(isValidJson("Sure! Here is your JSON:").score, 0);
});

test("matchesPattern, withinWordCount and avoidsPhrases", () => {
  assert.equal(matchesPattern(/^\d{4}-\d{2}-\d{2}$/)("2026-09-09").score, 1);
  assert.equal(matchesPattern(/^\d{4}$/)("nope").score, 0);
  assert.equal(withinWordCount(2, 4)("one two three").score, 1);
  assert.equal(withinWordCount(2, 4)("one").score, 0);
  assert.equal(avoidsPhrases(["as an AI"])("Sure, here you go.").score, 1);
  assert.equal(avoidsPhrases(["as an AI"])("As an AI language model...").score, 0);
});
