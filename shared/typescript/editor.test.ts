import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SandboxedEditor } from "./editor.ts";

function sandbox(): { editor: SandboxedEditor; root: string } {
  const root = mkdtempSync(join(tmpdir(), "editor-test-"));
  return { editor: new SandboxedEditor(root), root };
}

test("create then view round-trips", () => {
  const { editor } = sandbox();
  const created = editor.handle({
    command: "create",
    path: "notes.txt",
    file_text: "alpha\nbeta\ngamma",
  });
  assert.equal(created.isError, false);

  const viewed = editor.handle({ command: "view", path: "notes.txt" });
  assert.equal(viewed.isError, false);
  assert.match(viewed.content, /alpha/);
  assert.match(viewed.content, /1\t/);
});

test("view honours view_range including -1 for end of file", () => {
  const { editor } = sandbox();
  editor.handle({ command: "create", path: "a.txt", file_text: "1\n2\n3\n4\n5" });
  const middle = editor.handle({ command: "view", path: "a.txt", view_range: [2, 3] });
  assert.match(middle.content, /2\t2/);
  assert.ok(!middle.content.includes("4\t4"));

  const toEnd = editor.handle({ command: "view", path: "a.txt", view_range: [4, -1] });
  assert.match(toEnd.content, /5\t5/);
});

test("view reports a missing file as an error result, not an exception", () => {
  const { editor } = sandbox();
  const result = editor.handle({ command: "view", path: "nope.txt" });
  assert.equal(result.isError, true);
  assert.match(result.content, /File not found/);
});

test("str_replace requires exactly one match", () => {
  const { editor, root } = sandbox();
  editor.handle({ command: "create", path: "b.txt", file_text: "x = 1\nx = 1\n" });

  const many = editor.handle({
    command: "str_replace",
    path: "b.txt",
    old_str: "x = 1",
    new_str: "x = 2",
  });
  assert.equal(many.isError, true);
  assert.match(many.content, /matched 2 times/);

  const none = editor.handle({
    command: "str_replace",
    path: "b.txt",
    old_str: "y = 9",
    new_str: "z",
  });
  assert.equal(none.isError, true);
  assert.match(none.content, /not found/);

  const one = editor.handle({
    command: "str_replace",
    path: "b.txt",
    old_str: "x = 1\nx = 1",
    new_str: "x = 2",
  });
  assert.equal(one.isError, false);
  assert.equal(readFileSync(join(root, "b.txt"), "utf8"), "x = 2\n");
  // A backup was taken - undo_edit no longer exists to save you.
  assert.match(readFileSync(join(root, "b.txt.backup"), "utf8"), /x = 1/);
});

test("insert places text after the given line, 0 meaning the top", () => {
  const { editor, root } = sandbox();
  editor.handle({ command: "create", path: "c.txt", file_text: "one\ntwo" });

  editor.handle({
    command: "insert",
    path: "c.txt",
    insert_line: 0,
    insert_text: "zero",
  });
  assert.equal(readFileSync(join(root, "c.txt"), "utf8"), "zero\none\ntwo");

  const outOfRange = editor.handle({
    command: "insert",
    path: "c.txt",
    insert_line: 99,
    insert_text: "nope",
  });
  assert.equal(outOfRange.isError, true);
  assert.match(outOfRange.content, /outside/);
});

test("undo_edit is refused with a message naming the supported commands", () => {
  const { editor } = sandbox();
  const result = editor.handle({ command: "undo_edit", path: "a.txt" });
  assert.equal(result.isError, true);
  assert.match(result.content, /not supported/);
  assert.match(result.content, /view, str_replace, create, insert/);
});

test("an unknown command is refused rather than crashing", () => {
  const { editor } = sandbox();
  const result = editor.handle({ command: "rm_rf", path: "a.txt" });
  assert.equal(result.isError, true);
  assert.match(result.content, /unknown command/);
});

test("paths cannot escape the sandbox", () => {
  const { editor, root } = sandbox();
  const outside = join(root, "..", "escaped.txt");
  writeFileSync(outside, "secret", "utf8");

  for (const path of ["../escaped.txt", "../../etc/passwd", "/etc/passwd"]) {
    const result = editor.handle({ command: "view", path });
    assert.equal(result.isError, true, `${path} should be refused`);
    assert.match(result.content, /escapes the sandbox/);
  }
});
