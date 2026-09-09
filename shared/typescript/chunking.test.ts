import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkByCharacters, chunkByParagraph, chunkBySection } from "./chunking.ts";

test("chunkByCharacters respects size and overlap", () => {
  const text = "a".repeat(250);
  // stride = size - overlap = 80, so windows start at 0, 80, 160 and the
  // third window already reaches the end of the text.
  const chunks = chunkByCharacters(text, "doc", 100, 20);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0]!.text.length, 100);
  assert.equal(chunks[0]!.id, "doc#0");
  assert.equal(chunks.at(-1)!.text.length, 90);
});

test("chunkByCharacters rejects an overlap it cannot honour", () => {
  assert.throws(() => chunkByCharacters("abc", "doc", 10, 10), /overlap/);
  assert.throws(() => chunkByCharacters("abc", "doc", 0), /positive/);
});

test("chunkByParagraph packs paragraphs without splitting them", () => {
  const text = "First para.\n\nSecond para.\n\nThird para.";
  const chunks = chunkByParagraph(text, "doc", 30);
  assert.ok(chunks.length >= 2);
  for (const chunk of chunks) {
    assert.ok(!chunk.text.startsWith("\n"));
    assert.ok(chunk.text.trim().length > 0);
  }
  assert.equal(chunks.map((c) => c.text).join("\n\n"), text);
});

test("chunkBySection keeps each heading with its body", () => {
  const text = "# One\nbody one\n\n## Two\nbody two";
  const chunks = chunkBySection(text, "doc");
  assert.equal(chunks.length, 2);
  assert.ok(chunks[0]!.text.startsWith("# One"));
  assert.ok(chunks[1]!.text.startsWith("## Two"));
});
