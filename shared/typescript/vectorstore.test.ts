import { test } from "node:test";
import assert from "node:assert/strict";
import { VectorIndex } from "./vectorstore.ts";
import type { Chunk } from "./chunking.ts";

const chunk = (id: string): Chunk => ({ id, text: id, ordinal: 0, source: "a.md" });

test("search ranks by dot product", () => {
  const index = new VectorIndex("voyage-4-lite");
  index.add(
    [chunk("a"), chunk("b"), chunk("c")],
    [
      [1, 0],
      [0, 1],
      [0.7, 0.7],
    ],
  );
  const hits = index.search([1, 0], 2);
  assert.equal(hits[0]!.item.id, "a");
  assert.equal(hits[1]!.item.id, "c");
  assert.equal(index.size, 3);
});

test("adding mismatched batch lengths is rejected", () => {
  const index = new VectorIndex("voyage-4-lite");
  assert.throws(() => index.add([chunk("a")], [[1], [2]]), /Mismatched batch/);
});

test("a vector of the wrong dimension is rejected on add", () => {
  const index = new VectorIndex("voyage-4-lite");
  index.add([chunk("a")], [[1, 0]]);
  assert.throws(() => index.add([chunk("b")], [[1, 0, 0]]), /Dimension mismatch/);
});

test("a query from a different model is rejected", () => {
  const index = new VectorIndex("voyage-4-lite");
  index.add([chunk("a")], [[1, 0]]);
  assert.throws(() => index.search([1, 0], 1, "voyage-4-large"), /Rebuild the index/);
  // Same model is fine.
  assert.equal(index.search([1, 0], 1, "voyage-4-lite")[0]!.item.id, "a");
});

test("a query of the wrong dimension is rejected", () => {
  const index = new VectorIndex("voyage-4-lite");
  index.add([chunk("a")], [[1, 0]]);
  assert.throws(() => index.search([1, 0, 0], 1), /Dimension mismatch/);
});
