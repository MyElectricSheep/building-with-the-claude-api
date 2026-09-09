/**
 * Lesson 36 - Implementing the RAG flow, hardened.
 *
 * Fixes the inherited input_type and one-at-a-time embedding, then adds the
 * three things this is the right place for: contextual prefixes, citations, and
 * a score floor.
 *
 *   npm run lesson -- 36
 *   npm run lesson -- 36 -- --rebuild
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type Anthropic from "@anthropic-ai/sdk";
import { textOf } from "../../../shared/typescript/blocks.ts";
import type { Chunk } from "../../../shared/typescript/chunking.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import {
  EMBEDDING_MODEL,
  FAST_MODEL,
  MODEL,
} from "../../../shared/typescript/config.ts";
import {
  QUESTIONS,
  loadChunks,
  loadCorpus,
} from "../../../shared/typescript/corpus.ts";
import { embed } from "../../../shared/typescript/embeddings.ts";
import { VectorIndex } from "../../../shared/typescript/vectorstore.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CACHE_PATH = join(REPO_ROOT, "assets", "cache", "contextual.json");

// Below this dot-product score, refuse rather than answer. Retrieving three
// irrelevant chunks and asking anyway is how RAG systems hallucinate.
const SCORE_FLOOR = 0.35;

const SYSTEM =
  "Answer using only the supplied documents. If they do not contain the " +
  "answer, say exactly: 'That is not covered in these documents.'";

const client = createClient();
const chunks = loadChunks();
const rebuild = process.argv.includes("--rebuild");

/** One cheap generation per chunk, once, at index time. */
async function buildContextualPrefixes(): Promise<Record<string, string>> {
  const documents = new Map(loadCorpus().map((doc) => [doc.name, doc.text]));
  const prefixes: Record<string, string> = {};
  for (const chunk of chunks) {
    const response = await client.messages.create({
      model: FAST_MODEL,
      max_tokens: 120,
      messages: [
        {
          role: "user",
          content:
            `<document>\n${documents.get(chunk.source)}\n</document>\n\n` +
            `Here is a chunk from that document:\n\n<chunk>\n${chunk.text}\n</chunk>\n\n` +
            "Write ONE short sentence that situates this chunk within the whole " +
            "document, so it can be retrieved on its own. Name the document's " +
            "subject and what this chunk covers. No preamble.",
        },
      ],
    });
    prefixes[chunk.id] = textOf(response).trim();
    console.log(`  ${chunk.id}: ${prefixes[chunk.id]!.slice(0, 70)}`);
  }
  return prefixes;
}

async function loadOrBuild(): Promise<Record<string, string>> {
  if (existsSync(CACHE_PATH) && !rebuild) {
    const cached = JSON.parse(readFileSync(CACHE_PATH, "utf8")) as Record<
      string,
      string
    >;
    if (chunks.every((chunk) => chunk.id in cached)) {
      console.log(`contextual prefixes: cached (${Object.keys(cached).length})`);
      return cached;
    }
  }
  console.log("contextual prefixes: generating (cached afterwards)");
  const prefixes = await buildContextualPrefixes();
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, `${JSON.stringify(prefixes, null, 2)}\n`, "utf8");
  return prefixes;
}

async function buildIndex(texts: string[]): Promise<VectorIndex> {
  // Batch: one request for the whole corpus. Voyage returns an `index` per
  // embedding and the wrapper sorts by it - the API does not promise order.
  const result = await embed(texts, "document");
  const index = new VectorIndex(EMBEDDING_MODEL);
  index.add(chunks, result.embeddings);
  return index;
}

const prefixes = await loadOrBuild();
const plain = await buildIndex(chunks.map((chunk) => chunk.text));
const contextual = await buildIndex(
  chunks.map((chunk) => `${prefixes[chunk.id]}\n\n${chunk.text}`),
);
console.log(`\n${plain.size} chunks indexed two ways\n`);

const scores = { plain: 0, contextual: 0 };
const scorable = QUESTIONS.filter((entry) => entry.expect !== null);

for (const entry of QUESTIONS) {
  const { question } = entry;
  const queryVector = (await embed([question], "query")).embeddings[0]!;
  console.log(`Q: ${question}`);

  for (const [label, index] of [
    ["plain", plain],
    ["contextual", contextual],
  ] as const) {
    const top = index.search(queryVector, 3, EMBEDDING_MODEL)[0]!;
    let mark = "-";
    if (entry.expect !== null) {
      const correct = top.item.source === entry.expect;
      scores[label] += correct ? 1 : 0;
      mark = correct ? "PASS" : "MISS";
    }
    console.log(
      `   ${label.padEnd(11)} ${top.item.source.padEnd(16)} ${top.score.toFixed(3)}  [${mark}]`,
    );
  }

  // The score floor: refuse before spending a request.
  const hits = contextual.search(queryVector, 3, EMBEDDING_MODEL);
  if (hits[0]!.score < SCORE_FLOOR) {
    console.log(
      `   -> best score ${hits[0]!.score.toFixed(3)} < floor ${SCORE_FLOOR}; ` +
        "refused without calling the model\n",
    );
    continue;
  }

  // Citations: pass each chunk as a document block. Verifiable spans, not a
  // promise. NOTE: citations cannot be combined with output_config.format -
  // a request with both returns a 400.
  const content: Anthropic.ContentBlockParam[] = hits.map((hit) => ({
    type: "document",
    source: { type: "text", media_type: "text/plain", data: hit.item.text },
    title: hit.item.id,
    citations: { enabled: true },
  }));
  content.push({ type: "text", text: question });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: SYSTEM,
    messages: [{ role: "user", content }],
  });
  console.log(`   ${textOf(response).trim()}`);

  const cited = new Set<string>();
  for (const block of response.content) {
    if (block.type !== "text" || !block.citations) continue;
    for (const citation of block.citations) {
      if ("document_title" in citation && citation.document_title) {
        cited.add(citation.document_title);
      }
    }
  }
  console.log(
    `   cited: ${cited.size > 0 ? [...cited].sort().join(", ") : "(none)"}\n`,
  );
}

console.log(
  `top-1 accuracy   plain ${scores.plain}/${scorable.length}   ` +
    `contextual ${scores.contextual}/${scorable.length}`,
);
console.log(
  "\nContextual prefixes cost one cheap generation per chunk, once. On a\n" +
    "six-document corpus the gap is small; the technique earns its keep when\n" +
    "chunks are ambiguous out of context - which is most real corpora.",
);
