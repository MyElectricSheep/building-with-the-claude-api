/**
 * Lesson 37 - BM25 lexical search.
 *
 * Runs entirely locally. BM25 finds the exact token that embeddings blur - and
 * misses the paraphrase that embeddings catch. That complementarity is lesson
 * 38's whole argument.
 *
 *   npm run lesson -- 37
 */
import type { Chunk } from "../../../shared/typescript/chunking.ts";
import { QUESTIONS, loadChunks } from "../../../shared/typescript/corpus.ts";
import { BM25Index, tokenize } from "../../../shared/typescript/retrieval.ts";

const chunks = loadChunks();
const index = new BM25Index<Chunk>();
for (const chunk of chunks) index.add(chunk, chunk.text);

console.log(`${chunks.length} chunks indexed\n`);

let correct = 0;
const scorable = QUESTIONS.filter((entry) => entry.expect !== null);

for (const entry of QUESTIONS) {
  const hits = index.search(entry.question, 3);
  const top = hits[0]?.item.source ?? "(nothing matched)";
  let mark = "n/a";
  if (entry.expect !== null) {
    const ok = top === entry.expect;
    correct += ok ? 1 : 0;
    mark = ok ? "PASS" : "MISS";
  }
  // No document answers the last one. BM25 will still return something -
  // a lexical score is not a relevance guarantee.
  console.log(`[${mark.padEnd(4)}] ${entry.question}`);
  for (const hit of hits) {
    console.log(`         ${hit.score.toFixed(3).padStart(6)}  ${hit.item.id}`);
  }
  console.log();
}

console.log(`top-1 accuracy: ${correct}/${scorable.length}\n`);

// Why did that rank first? BM25 is not magic - it is IDF.
const query = "What is the ticket type for production access?";
console.log(`term weights for: "${query}"`);
const documentFrequency = new Map<string, number>();
for (const chunk of chunks) {
  for (const term of new Set(tokenize(chunk.text))) {
    documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
  }
}
for (const term of tokenize(query)) {
  const df = documentFrequency.get(term) ?? 0;
  const idf = Math.log(1 + (chunks.length - df + 0.5) / (df + 0.5));
  console.log(
    `  ${term.padEnd(12)} in ${String(df).padStart(2)}/${chunks.length} chunks   ` +
      `idf ${idf.toFixed(3)}`,
  );
}
console.log("  Rare terms carry the ranking. Common ones barely move it.\n");

// The pair that motivates hybrid retrieval.
const PARAPHRASE = "what paperwork lets me reach the live environment?";
console.log("same fact, two ways of asking");
// Both ask for the same fact - "how do I get production access?" - but only
// one of them shares a rare token with the document that answers it.
const outcomes: Record<string, string> = {};
for (const [label, question] of [
  ["exact term", "ACCESS-PROD"],
  ["paraphrase", PARAPHRASE],
] as const) {
  const found = index.search(question, 1)[0]?.item.source ?? "(nothing matched)";
  outcomes[label] = found;
  const mark = found === "onboarding.md" ? "PASS" : "MISS";
  console.log(
    `  [${mark}] ${label.padEnd(11)} ${JSON.stringify(question)} -> ${found}`,
  );
}

console.log(
  `\nBM25 found the identifier in ${outcomes["exact term"]} and the paraphrase ` +
    `in ${outcomes.paraphrase}.\n` +
    "The paraphrase shares no rare token with the document that answers it, so\n" +
    "IDF has nothing to work with and it ranks on whatever common words happen\n" +
    "to overlap. Embeddings fail the opposite way. Neither is the better\n" +
    "retriever; lesson 38 runs both.",
);
