/**
 * Lesson 32 - Introducing RAG.
 *
 * Stuff-everything vs retrieve-then-ask over the same corpus. The point is not
 * that RAG wins at this size - it is the token ratio, which is what does not
 * scale.
 *
 * No VOYAGE_API_KEY needed: this uses lexical retrieval so the concept lands
 * before embeddings arrive in lesson 34.
 *
 *   npm run lesson -- 32
 */
import { textOf } from "../../../shared/typescript/blocks.ts";
import type { Chunk } from "../../../shared/typescript/chunking.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";
import {
  QUESTIONS,
  loadChunks,
  loadCorpus,
} from "../../../shared/typescript/corpus.ts";
import { BM25Index } from "../../../shared/typescript/retrieval.ts";

const SYSTEM =
  "Answer using only the supplied context. If the context does not contain " +
  "the answer, say so plainly - do not guess.";

const client = createClient();
const corpus = loadCorpus();
const chunks = loadChunks();

const everything = corpus
  .map((document) => `# ${document.name}\n${document.text}`)
  .join("\n\n");

const index = new BM25Index<Chunk>();
for (const chunk of chunks) index.add(chunk, chunk.text);

console.log(`corpus: ${corpus.length} documents, ${chunks.length} chunks\n`);

let stuffedTotal = 0;
let retrievedTotal = 0;

for (const entry of QUESTIONS.slice(0, 4)) {
  const { question } = entry;
  console.log(`Q: ${question}`);

  // 1. Stuff everything.
  const stuffed = `<context>\n${everything}\n</context>\n\n${question}`;
  // countTokens is free - use it before you spend anything.
  const stuffedCount = await client.messages.countTokens({
    model: MODEL,
    system: SYSTEM,
    messages: [{ role: "user", content: stuffed }],
  });
  stuffedTotal += stuffedCount.input_tokens;

  // 2. Retrieve, then ask.
  const hits = index.search(question, 3);
  const context = hits.map((hit) => `# ${hit.item.id}\n${hit.item.text}`).join("\n\n");
  const retrieved = `<context>\n${context}\n</context>\n\n${question}`;
  const retrievedCount = await client.messages.countTokens({
    model: MODEL,
    system: SYSTEM,
    messages: [{ role: "user", content: retrieved }],
  });
  retrievedTotal += retrievedCount.input_tokens;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: SYSTEM,
    messages: [{ role: "user", content: retrieved }],
  });

  console.log(`   retrieved from: ${hits.map((hit) => hit.item.source).join(", ")}`);
  console.log(`   ${textOf(response).trim()}`);
  console.log(
    `   tokens: stuffed ${stuffedCount.input_tokens} | retrieved ${retrievedCount.input_tokens}\n`,
  );
}

const ratio = retrievedTotal > 0 ? stuffedTotal / retrievedTotal : 0;
console.log(
  `total input tokens: stuffed ${stuffedTotal} | retrieved ${retrievedTotal}`,
);
console.log(`ratio: ${ratio.toFixed(1)}x\n`);
console.log(
  "At six documents, stuffing works fine - a 1M-token window swallows this\n" +
    "corpus whole. The ratio is what changes at 6,000 documents. And even\n" +
    "where it fits, irrelevant context measurably costs answer quality: RAG\n" +
    "buys precision, not just tokens.",
);
