import { test } from "node:test";
import assert from "node:assert/strict";
import { auditPrefix, likelyBelowMinimum } from "./cacheaudit.ts";

test("a stable prefix produces no findings", () => {
  const findings = auditPrefix({
    system: "You are a handbook assistant. Answer from the handbook.",
    tools: [{ name: "a_tool" }, { name: "b_tool" }],
    stableMessages: ["What is the on-call handover time?"],
  });
  assert.deepEqual(findings, []);
});

test("a timestamp in the system prompt is caught", () => {
  const findings = auditPrefix({
    system: "Current time: 2026-09-09T13:36:00Z\nYou are an assistant.",
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0]!.where, "system");
  assert.match(findings[0]!.problem, /timestamp/);
});

test("a UUID and a request id are caught", () => {
  const findings = auditPrefix({
    system: "trace 3f2504e0-4f89-11d3-9a0c-0305e82c3301 request_id abc",
  });
  assert.equal(findings.length, 2);
});

test("an invalidator in an early message is caught", () => {
  const findings = auditPrefix({
    stableMessages: ["ok", "generated at 2026-09-09T00:00:00Z"],
  });
  assert.equal(findings[0]!.where, "messages[1]");
});

test("non-deterministic tool order is flagged", () => {
  const findings = auditPrefix({ tools: [{ name: "z_tool" }, { name: "a_tool" }] });
  assert.equal(findings.length, 1);
  assert.match(findings[0]!.problem, /not deterministic/);
});

test("likelyBelowMinimum uses a rough token estimate", () => {
  assert.equal(likelyBelowMinimum("short"), true);
  assert.equal(likelyBelowMinimum("x".repeat(8000)), false);
  assert.equal(likelyBelowMinimum("x".repeat(8000), 4096), true);
});
