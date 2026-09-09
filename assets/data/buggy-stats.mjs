/**
 * Summary statistics. Two bugs; one is obvious and one is not.
 *
 * Run this file to see which checks fail. Fix the functions above the check
 * harness - the harness itself is correct and should not be edited.
 */

export function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  // BUG 1 (obvious): for an even-length list this returns the upper of the two
  // middle values instead of their average.
  return ordered[middle];
}

export function summarise(values) {
  // BUG 2 (subtle): an empty list yields NaN from mean() and undefined from
  // median(), rather than an empty summary with mean and median set to null.
  return { n: values.length, mean: mean(values), median: median(values) };
}

const CHECKS = [
  ["median of an even-length list", () => summarise([1, 2, 3, 4]).median, 2.5],
  ["median of a single value", () => summarise([5]).median, 5],
  ["mean of an even-length list", () => summarise([1, 2, 3, 4]).mean, 2.5],
  ["empty input must not raise", () => summarise([]).n, 0],
  ["empty input has a null mean", () => summarise([]).mean, null],
];

function runChecks() {
  const failures = [];
  for (const [label, thunk, expected] of CHECKS) {
    let actual;
    try {
      actual = thunk();
    } catch (error) {
      failures.push(`${label}: threw ${error.name}`);
      continue;
    }
    if (!Object.is(actual, expected)) {
      const show = (value) =>
        typeof value === "number" || value === null || value === undefined
          ? String(value)
          : JSON.stringify(value);
      failures.push(`${label}: got ${show(actual)}, want ${show(expected)}`);
    }
  }
  return failures;
}

const problems = runChecks();
if (problems.length > 0) {
  console.log("FAIL");
  for (const problem of problems) console.log(`  - ${problem}`);
} else {
  console.log("PASS: all checks");
}
