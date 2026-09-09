/**
 * Lesson 35 - The full RAG flow.
 *
 * The whole pipeline in one readable pass, each stage labelled and timed - and
 * it runs the question no document answers, because that is the case people
 * forget to test.
 *
 *   npm run lesson -- 35
 */
import { textOf } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { EMBEDDING_MODEL, MODEL } from "../../../shared/typescript/config.ts";
import { QUESTIONS, loadChunks } from "../../../shared/typescript/corpus.ts";
import { embed } from "../../../shared/typescript/embeddings.ts";
import { VectorIndex } from "../../../shared/typescript/vectorstore.ts";

const SYSTEM =
  "Answer using only the supplied context. Quote the section heading you " +
  "used. If the context does not contain the answer, say exactly: " +
  "'That is not covered in these documents.'";

const client = createClient();

// 1. Load and chunk (section-aware, lesson 33).
const started = Date.now();
const chunks = loadChunks();
console.log(`1. chunk    ${chunks.length} chunks from the corpus`);

// 2. Embed the chunks. ONE batched call, input_type="document".
const docResult = await embed(
  chunks.map((chunk) => chunk.text),
  "document",
);
console.log(
  `2. embed    ${docResult.embeddings.length} vectors, ` +
    `${docResult.embeddings[0]!.length} dims, ` +
    `${docResult.totalTokens} tokens, one request`,
);

// 3. Index. It records the model it was built with; see vectorstore.ts.
const index = new VectorIndex(EMBEDDING_MODEL);
index.add(chunks, docResult.embeddings);
console.log(`3. index    ${index.size} vectors, model ${index.model}`);
console.log(`   indexing took ${Date.now() - started} ms\n`);

for (const entry of QUESTIONS) {
  const { question } = entry;
  console.log(`Q: ${question}`);

  // 4. Embed the question. input_type="query" - the lesson-34 trap.
  const queryVector = (await embed([question], "query")).embeddings[0]!;

  // 5. Search.
  const hits = index.search(queryVector, 3, EMBEDDING_MODEL);
  console.log(
    `   retrieved: ${hits
      .map((hit) => `${hit.item.source} (${hit.score.toFixed(3)})`)
      .join(", ")}`,
  );

  // 6. Ask.
  const context = hits.map((hit) => `# ${hit.item.id}\n${hit.item.text}`).join("\n\n");
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: SYSTEM,
    messages: [
      { role: "user", content: `<context>\n${context}\n</context>\n\n${question}` },
    ],
  });
  const answer = textOf(response).trim();
  console.log(`   ${answer}`);

  if (entry.expect === null) {
    const declined = answer.toLowerCase().includes("not covered");
    console.log(
      `   [${declined ? "PASS" : "FAIL"}] no document answers this; the system must say so`,
    );
  } else {
    const top = hits[0]!.item.source;
    console.log(
      `   [${top === entry.expect ? "PASS" : "MISS"}] expected ${entry.expect}, top hit ${top}`,
    );
  }
  console.log();
}

console.log(
  "The index is versioned by the embedding model. Change the model, the\n" +
    "dimension or the chunking and every stored vector is from a different\n" +
    "space - rebuild it. Nothing errors if you do not; the rankings just\n" +
    "become nonsense.",
);
