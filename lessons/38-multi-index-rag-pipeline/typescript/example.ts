/**
 * Lesson 38 - A multi-index RAG pipeline.
 *
 * Semantic + lexical + RRF fusion + reranking, scored on the same questions so
 * the complementarity is visible rather than asserted.
 *
 *   npm run lesson -- 38
 */
import type { Chunk } from "../../../shared/typescript/chunking.ts";
import { EMBEDDING_MODEL } from "../../../shared/typescript/config.ts";
import { QUESTIONS, loadChunks } from "../../../shared/typescript/corpus.ts";
import { embed, rerank } from "../../../shared/typescript/embeddings.ts";
import {
  BM25Index,
  reciprocalRankFusion,
} from "../../../shared/typescript/retrieval.ts";
import { VectorIndex } from "../../../shared/typescript/vectorstore.ts";

const CANDIDATES = 8; // retrieve this many cheaply, then rerank
const FINAL = 3;

const chunks = loadChunks();

// Semantic index.
const docResult = await embed(
  chunks.map((chunk) => chunk.text),
  "document",
);
const semantic = new VectorIndex(EMBEDDING_MODEL);
semantic.add(chunks, docResult.embeddings);

// Lexical index.
const lexical = new BM25Index<Chunk>();
for (const chunk of chunks) lexical.add(chunk, chunk.text);

console.log(`${chunks.length} chunks | semantic ${EMBEDDING_MODEL} | lexical BM25\n`);
const header =
  "question".padEnd(46) +
  "semantic".padEnd(14) +
  "lexical".padEnd(14) +
  "hybrid".padEnd(14) +
  "reranked";
console.log(header);
console.log("-".repeat(header.length));

const tallies: Record<string, number> = {
  semantic: 0,
  lexical: 0,
  hybrid: 0,
  reranked: 0,
};
const scorable = QUESTIONS.filter((entry) => entry.expect !== null);

for (const entry of QUESTIONS) {
  const { question } = entry;
  const queryVector = (await embed([question], "query")).embeddings[0]!;

  const semanticHits = semantic
    .search(queryVector, CANDIDATES, EMBEDDING_MODEL)
    .map((hit) => hit.item);
  const lexicalHits = lexical.search(question, CANDIDATES).map((hit) => hit.item);

  // RRF uses RANKS, never scores: a BM25 score of 4.9 and a cosine of 0.71 are
  // not on the same scale and never will be.
  const hybridHits = reciprocalRankFusion(
    [semanticHits, lexicalHits],
    (chunk) => chunk.id,
  )
    .map((scored) => scored.item)
    .slice(0, CANDIDATES);

  // Rerank the fused shortlist with a cross-encoder.
  let reranked: Chunk[] = [];
  if (hybridHits.length > 0) {
    const hits = await rerank(
      question,
      hybridHits.map((chunk) => chunk.text),
      FINAL,
    );
    reranked = hits.map((hit) => hybridHits[hit.index]!);
  }

  const results: Record<string, string> = {
    semantic: semanticHits[0]?.source ?? "-",
    lexical: lexicalHits[0]?.source ?? "-",
    hybrid: hybridHits[0]?.source ?? "-",
    reranked: reranked[0]?.source ?? "-",
  };

  const marks: Record<string, string> = {};
  for (const [name, top] of Object.entries(results)) {
    if (entry.expect !== null) {
      const ok = top === entry.expect;
      tallies[name] = (tallies[name] ?? 0) + (ok ? 1 : 0);
      marks[name] = `${ok ? "+" : "-"}${top.replace(".md", "")}`;
    } else {
      marks[name] = top.replace(".md", "");
    }
  }

  console.log(
    question.slice(0, 44).padEnd(46) +
      marks.semantic!.padEnd(14) +
      marks.lexical!.padEnd(14) +
      marks.hybrid!.padEnd(14) +
      marks.reranked,
  );
}

console.log();
for (const [name, score] of Object.entries(tallies)) {
  console.log(`  top-1 ${name.padEnd(10)} ${score}/${scorable.length}`);
}

console.log(
  "\nRRF fuses ranks, not scores, which is why it needs no calibration\n" +
    "between two retrievers on incompatible scales. Reranking goes after\n" +
    "fusion: retrieve ~50 cheaply, rerank, keep 5. k=60 in RRF is a\n" +
    "convention - lower it to sharpen the top ranks, raise it to flatten\n" +
    "toward a simple vote. And measure any weighting on a held-out set.",
);
