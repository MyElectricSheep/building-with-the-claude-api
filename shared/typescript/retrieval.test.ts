import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BM25Index,
  cosineSimilarity,
  dotProduct,
  reciprocalRankFusion,
  tokenize,
  topK,
} from "./retrieval.ts";

test("dotProduct rejects mismatched dimensions", () => {
  assert.throws(() => dotProduct([1, 2], [1]), /Dimension mismatch/);
});

test("cosineSimilarity matches dotProduct for unit vectors", () => {
  const a = [0.6, 0.8];
  const b = [1, 0];
  assert.ok(Math.abs(cosineSimilarity(a, b) - dotProduct(a, b)) < 1e-12);
});

test("cosineSimilarity handles the zero vector without dividing by zero", () => {
  assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
});

test("tokenize lowercases and drops punctuation", () => {
  assert.deepEqual(tokenize("Hello, WORLD! -- 42"), ["hello", "world", "42"]);
});

test("topK returns the highest scores in order", () => {
  const scored = [
    { item: "a", score: 1 },
    { item: "b", score: 3 },
    { item: "c", score: 2 },
  ];
  assert.deepEqual(
    topK(scored, 2).map((entry) => entry.item),
    ["b", "c"],
  );
  // The input array is not mutated.
  assert.equal(scored[0]!.item, "a");
});

test("BM25 ranks an exact identifier above a semantic near-miss", () => {
  const index = new BM25Index<string>();
  index.add("d1", "The invoice INV-88213 was paid in full last Tuesday.");
  index.add("d2", "Payments and billing statements are processed monthly.");
  index.add("d3", "Unrelated notes about the office coffee machine.");

  const results = index.search("INV-88213", 3);
  assert.equal(results[0]!.item, "d1");
  assert.equal(index.size, 3);
});

test("BM25 returns nothing when no query term appears", () => {
  const index = new BM25Index<string>();
  index.add("d1", "alpha beta");
  assert.deepEqual(index.search("gamma"), []);
});

test("reciprocalRankFusion rewards agreement between rankings", () => {
  const semantic = ["a", "b", "c"];
  const lexical = ["c", "a", "d"];
  const fused = reciprocalRankFusion([semantic, lexical], (id) => id);
  assert.equal(fused[0]!.item, "a");
  assert.equal(fused.length, 4);
});
