import { test } from "node:test";
import assert from "node:assert/strict";
import { recommendTier } from "./tiers.ts";
import type { TaskShape } from "./tiers.ts";

const AGENT_SHAPED: TaskShape = {
  stepsAreKnowable: false,
  needsMultipleSteps: true,
  outcomeJustifiesCost: true,
  measuredViable: true,
  errorsAreRecoverable: true,
  needsHostedRuntime: false,
};

test("a single-step task is a single call", () => {
  const result = recommendTier({ ...AGENT_SHAPED, needsMultipleSteps: false });
  assert.equal(result.tier, "single-call");
});

test("a knowable sequence is a workflow, whatever else is true", () => {
  const result = recommendTier({ ...AGENT_SHAPED, stepsAreKnowable: true });
  assert.equal(result.tier, "workflow");
  assert.deepEqual(result.failed, []);
});

test("all four checks passing gives an agent", () => {
  const result = recommendTier(AGENT_SHAPED);
  assert.equal(result.tier, "agent");
  assert.deepEqual(result.failed, []);
});

test("a hosted runtime requirement escalates to a managed agent", () => {
  const result = recommendTier({ ...AGENT_SHAPED, needsHostedRuntime: true });
  assert.equal(result.tier, "hosted-agent");
});

test("each failing check drops it back to a workflow and says which", () => {
  for (const [key, label] of [
    ["outcomeJustifiesCost", "value"],
    ["measuredViable", "viability"],
    ["errorsAreRecoverable", "cost of error"],
  ] as const) {
    const result = recommendTier({ ...AGENT_SHAPED, [key]: false });
    assert.equal(result.tier, "workflow", key);
    assert.deepEqual(result.failed, [label]);
  }
});

test("several failing checks are all reported", () => {
  const result = recommendTier({
    ...AGENT_SHAPED,
    measuredViable: false,
    errorsAreRecoverable: false,
  });
  assert.equal(result.tier, "workflow");
  assert.deepEqual(result.failed, ["viability", "cost of error"]);
});

test("an unrecoverable task never becomes a hosted agent", () => {
  const result = recommendTier({
    ...AGENT_SHAPED,
    needsHostedRuntime: true,
    errorsAreRecoverable: false,
  });
  assert.equal(result.tier, "workflow");
});
