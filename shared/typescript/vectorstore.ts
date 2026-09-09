/**
 * A minimal in-memory vector index (lessons 35-38).
 *
 * The one thing it does beyond storing arrays: it records the embedding model
 * and dimension it was built with, and refuses a query vector from a different
 * space. Mixing vectors from two models produces no error and nonsense
 * rankings, which is a genuinely hard bug to spot.
 */
import type { Chunk } from "./chunking.ts";
import { dotProduct, topK } from "./retrieval.ts";
import type { Scored } from "./retrieval.ts";

export class VectorIndex {
  private readonly chunks: Chunk[] = [];
  private readonly vectors: number[][] = [];
  readonly model: string;
  private dimension: number | null = null;

  constructor(model: string) {
    this.model = model;
  }

  add(chunks: readonly Chunk[], vectors: readonly number[][]): void {
    if (chunks.length !== vectors.length) {
      throw new Error(
        `Mismatched batch: ${chunks.length} chunks, ${vectors.length} vectors`,
      );
    }
    for (let i = 0; i < chunks.length; i += 1) {
      const vector = vectors[i]!;
      this.dimension ??= vector.length;
      if (vector.length !== this.dimension) {
        throw new Error(
          `Dimension mismatch: index is ${this.dimension}, vector is ${vector.length}`,
        );
      }
      this.chunks.push(chunks[i]!);
      this.vectors.push(vector);
    }
  }

  /**
   * Search. `queryModel` is checked against the index's model: an index is
   * versioned by the embedding model that built it.
   */
  search(queryVector: readonly number[], k = 3, queryModel?: string): Scored<Chunk>[] {
    if (queryModel !== undefined && queryModel !== this.model) {
      throw new Error(
        `Index was built with ${this.model} but the query was embedded with ` +
          `${queryModel}. Rebuild the index; vectors from two models are not ` +
          `comparable.`,
      );
    }
    if (this.dimension !== null && queryVector.length !== this.dimension) {
      throw new Error(
        `Dimension mismatch: index is ${this.dimension}, query is ${queryVector.length}`,
      );
    }
    // Voyage vectors are L2-normalised, so a dot product ranks identically to
    // cosine similarity and is cheaper.
    const scored = this.vectors.map((vector, index) => ({
      item: this.chunks[index]!,
      score: dotProduct(vector, queryVector),
    }));
    return topK(scored, k);
  }

  get size(): number {
    return this.chunks.length;
  }
}
