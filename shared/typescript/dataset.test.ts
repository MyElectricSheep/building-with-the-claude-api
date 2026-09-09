import { test } from "node:test";
import assert from "node:assert/strict";
import { ORDER_ID_PATTERN, validateCases } from "./dataset.ts";
import type { GeneratedCase } from "./dataset.ts";

const good: GeneratedCase = {
  id: "a",
  input: "My card was charged twice for order #B-1002 and I need a refund today.",
  expected: { category: "billing", urgency: "high", has_order_id: true },
};

test("accepts a well-formed case and marks it unreviewed", () => {
  const { accepted, issues } = validateCases([good]);
  assert.equal(issues.length, 0);
  assert.equal(accepted[0]!.reviewed, false);
});

test("rejects duplicate ids", () => {
  const { accepted, issues } = validateCases([good, { ...good }]);
  assert.equal(accepted.length, 1);
  assert.match(issues[0]!.problem, /duplicate id/);
});

test("rejects labels outside the enum", () => {
  const { issues } = validateCases([
    { ...good, expected: { ...good.expected, category: "refunds" } },
  ]);
  assert.match(issues[0]!.problem, /not in the enum/);
});

test("catches a has_order_id label that contradicts the email", () => {
  const { issues } = validateCases([
    {
      id: "b",
      input: "Please cancel my subscription at the end of the period, thanks.",
      expected: { category: "account", urgency: "low", has_order_id: true },
    },
  ]);
  assert.match(issues[0]!.problem, /contradicts/);
});

test("rejects an email too short to be realistic", () => {
  const { issues } = validateCases([{ ...good, id: "c", input: "help" }]);
  assert.match(issues[0]!.problem, /too short/);
});

test("the order-id pattern matches real identifiers and not the bare word", () => {
  assert.ok(ORDER_ID_PATTERN.test("charged for order #A-77210 twice"));
  assert.ok(ORDER_ID_PATTERN.test("order 44-9921 is blocked"));
  assert.ok(ORDER_ID_PATTERN.test("any update on #Z-31?"));
  assert.equal(ORDER_ID_PATTERN.test("I placed an order last week"), false);
});
