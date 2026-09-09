import { test } from "node:test";
import assert from "node:assert/strict";
import { supportsEffort } from "./config.ts";

test("effort is rejected on Haiku 4.5 and Sonnet 4.5", () => {
  // Verified live: claude-haiku-4-5 returns
  // 400 "This model does not support the effort parameter."
  assert.equal(supportsEffort("claude-haiku-4-5"), false);
  assert.equal(supportsEffort("claude-haiku-4-5-20251001"), false);
  assert.equal(supportsEffort("claude-sonnet-4-5-20250929"), false);
});

test("effort is accepted on Sonnet 4.6 and later, and the Opus/Fable families", () => {
  for (const model of [
    "claude-sonnet-4-6",
    "claude-sonnet-5",
    "claude-opus-4-6",
    "claude-opus-5",
    "claude-fable-5-1",
  ]) {
    assert.equal(supportsEffort(model), true, model);
  }
});
