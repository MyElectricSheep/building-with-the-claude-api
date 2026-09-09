/**
 * Lesson 34 - Text embeddings, and the input_type trap.
 *
 * Three embeddings of the same corpus, differing only in input_type, scored on
 * the same questions. The wrong pairing produces no error at all - it just
 * retrieves worse, invisibly.
 *
 *   npm run lesson -- 34
 */
import { EMBEDDING_MODEL } from "../../../shared/typescript/config.ts";
import { QUESTIONS, loadChunks } from "../../../shared/typescript/corpus.ts";
import { embed } from "../../../shared/typescript/embeddings.ts";
import type { InputType } from "../../../shared/typescript/embeddings.ts";
import { cosineSimilarity, dotProduct } from "../../../shared/typescript/retrieval.ts";

const PAIRINGS: [string, InputType, InputType][] = [
  ["correct        (doc/query)", "document", "query"],
  ["Academy default (query/query)", "query", "query"],
  ["inverted       (query/doc)", "query", "document"],
];

const chunks = loadChunks();
const questions = QUESTIONS.filter((entry) => entry.expect !== null);
const texts = chunks.map((chunk) => chunk.text);

console.log(
  `model ${EMBEDDING_MODEL} | ${chunks.length} chunks | ${questions.length} questions`,
);
console.log("(the question with no answer in the corpus is excluded from scoring)\n");

for (const [label, docType, queryType] of PAIRINGS) {
  // Batch. One request for the whole corpus, not one per chunk.
  const docResult = await embed(texts, docType);
  const queryResult = await embed(
    questions.map((entry) => entry.question),
    queryType,
  );

  let correct = 0;
  questions.forEach((entry, index) => {
    const queryVector = queryResult.embeddings[index]!;
    // Voyage vectors are L2-normalised, so the dot product ranks identically to
    // cosine similarity and is cheaper.
    const scores = docResult.embeddings.map((vector) =>
      dotProduct(vector, queryVector),
    );
    let best = 0;
    scores.forEach((score, i) => {
      if (score > scores[best]!) best = i;
    });
    if (chunks[best]!.source === entry.expect) correct += 1;
  });

  const tokens = docResult.totalTokens + queryResult.totalTokens;
  console.log(
    `${label.padEnd(30)} top-1 ${correct}/${questions.length}   ` +
      `(${tokens} embedding tokens)`,
  );
}

// Dot product vs cosine on normalised vectors: same ranking.
const sample = (await embed(texts.slice(0, 3), "document")).embeddings;
const queryVector = (await embed([questions[0]!.question], "query")).embeddings[0]!;
const dots = sample.map((vector) => dotProduct(vector, queryVector));
const cosines = sample.map((vector) => cosineSimilarity(vector, queryVector));
const order = (values: number[]) =>
  values.map((_, i) => i).sort((a, b) => values[b]! - values[a]!);
const sameOrder = JSON.stringify(order(dots)) === JSON.stringify(order(cosines));

console.log(`\ndot and cosine agree on ranking: ${sameOrder}`);
console.log(`  dot    [${dots.map((v) => v.toFixed(4)).join(", ")}]`);
console.log(`  cosine [${cosines.map((v) => v.toFixed(4)).join(", ")}]`);

console.log(
  "\nThe wrong input_type pairing raises nothing. It is not a bug you find\n" +
    "by running the code - it is one you find by measuring retrieval.",
);
