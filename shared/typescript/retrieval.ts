/**
 * Retrieval primitives for lessons 34-38. Pure functions - no network.
 *
 * Voyage embeddings are L2-normalised, so a dot product ranks identically to
 * cosine similarity and is cheaper. `cosineSimilarity` is kept for vectors
 * from other providers that are not normalised.
 */

export function dotProduct(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += a[i]! * b[i]!;
  return sum;
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const norm = Math.sqrt(dotProduct(a, a)) * Math.sqrt(dotProduct(b, b));
  return norm === 0 ? 0 : dotProduct(a, b) / norm;
}

export interface Scored<T> {
  item: T;
  score: number;
}

export function topK<T>(scored: Scored<T>[], k: number): Scored<T>[] {
  return [...scored].sort((a, b) => b.score - a.score).slice(0, k);
}

/** Lowercase, strip punctuation, split on whitespace. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Okapi BM25 (lesson 37). Lexical retrieval that catches the exact
 * identifiers, product codes and proper nouns that embeddings blur.
 */
export class BM25Index<T> {
  private readonly docs: { item: T; tokens: string[]; length: number }[] = [];
  private readonly df = new Map<string, number>();
  private averageLength = 0;

  private readonly k1: number;
  private readonly b: number;

  // Written out rather than as constructor parameter properties: parameter
  // properties are not erasable syntax, so Node's built-in type stripping
  // (and `erasableSyntaxOnly` in tsconfig.json) rejects them.
  constructor(k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;
  }

  add(item: T, text: string): void {
    const tokens = tokenize(text);
    this.docs.push({ item, tokens, length: tokens.length });
    for (const term of new Set(tokens)) {
      this.df.set(term, (this.df.get(term) ?? 0) + 1);
    }
    const total = this.docs.reduce((sum, doc) => sum + doc.length, 0);
    this.averageLength = total / this.docs.length;
  }

  search(query: string, k = 5): Scored<T>[] {
    const terms = tokenize(query);
    const scored = this.docs.map((doc) => {
      const counts = new Map<string, number>();
      for (const token of doc.tokens) {
        counts.set(token, (counts.get(token) ?? 0) + 1);
      }
      let score = 0;
      for (const term of terms) {
        const frequency = counts.get(term);
        if (!frequency) continue;
        const docFrequency = this.df.get(term) ?? 0;
        const idf = Math.log(
          1 + (this.docs.length - docFrequency + 0.5) / (docFrequency + 0.5),
        );
        const denominator =
          frequency +
          this.k1 * (1 - this.b + (this.b * doc.length) / this.averageLength);
        score += idf * ((frequency * (this.k1 + 1)) / denominator);
      }
      return { item: doc.item, score };
    });
    return topK(scored, k).filter((entry) => entry.score > 0);
  }

  get size(): number {
    return this.docs.length;
  }
}

/**
 * Reciprocal Rank Fusion (lesson 38): merge independent ranked lists without
 * needing their scores to share a scale.
 */
export function reciprocalRankFusion<T>(
  rankings: T[][],
  keyOf: (item: T) => string,
  k = 60,
): Scored<T>[] {
  const scores = new Map<string, number>();
  const items = new Map<string, T>();

  for (const ranking of rankings) {
    ranking.forEach((item, index) => {
      const key = keyOf(item);
      items.set(key, item);
      scores.set(key, (scores.get(key) ?? 0) + 1 / (k + index + 1));
    });
  }

  return [...scores.entries()]
    .map(([key, score]) => ({ item: items.get(key)!, score }))
    .sort((a, b) => b.score - a.score);
}
