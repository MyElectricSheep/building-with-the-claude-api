import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveLessonDir } from "./run-lesson.mjs";

const LESSONS = [
  "01-accessing-the-api",
  "03-making-a-request",
  "13-model-based-grading",
  "30-the-text-edit-tool",
  "31-the-web-search-tool",
];

test("resolves a bare number", () => {
  assert.equal(resolveLessonDir(LESSONS, "3"), "03-making-a-request");
  assert.equal(resolveLessonDir(LESSONS, "03"), "03-making-a-request");
  assert.equal(resolveLessonDir(LESSONS, "13"), "13-model-based-grading");
});

test("resolves a full slug", () => {
  assert.equal(
    resolveLessonDir(LESSONS, "31-the-web-search-tool"),
    "31-the-web-search-tool",
  );
});

test("resolves a unique partial slug", () => {
  assert.equal(resolveLessonDir(LESSONS, "web-search"), "31-the-web-search-tool");
});

test("rejects an ambiguous partial slug", () => {
  assert.throws(() => resolveLessonDir(LESSONS, "the-"), /matches several/);
});

test("rejects an unknown lesson", () => {
  assert.throws(() => resolveLessonDir(LESSONS, "99"), /No lesson matches/);
});
