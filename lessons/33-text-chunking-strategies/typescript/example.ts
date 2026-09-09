/**
 * Lesson 33 - Text chunking strategies.
 *
 * Runs entirely locally. Three strategies over the same document, with the
 * retrieval failure that fixed-size chunking causes made concrete.
 *
 *   npm run lesson -- 33
 */
import {
  chunkByCharacters,
  chunkByParagraph,
  chunkBySection,
} from "../../../shared/typescript/chunking.ts";
import type { Chunk } from "../../../shared/typescript/chunking.ts";
import { loadCorpus } from "../../../shared/typescript/corpus.ts";

const HEADING = /^#{1,6}\s/;

/** Chunks that are a heading with (almost) no body. */
function orphanedHeadings(chunks: readonly Chunk[]): number {
  return chunks.filter((chunk) => {
    const lines = chunk.text.split("\n").filter((line) => line.trim().length > 0);
    return lines.length === 1 && HEADING.test(lines[0]!);
  }).length;
}

function report(label: string, chunks: Chunk[]): void {
  const sizes = chunks.map((chunk) => chunk.text.length);
  const tiny = sizes.filter((size) => size < 120).length;
  const mean = Math.floor(sizes.reduce((sum, size) => sum + size, 0) / sizes.length);
  console.log(
    `${label.padEnd(22)} ${String(chunks.length).padStart(3)} chunks  ` +
      `min ${String(Math.min(...sizes)).padStart(4)}  ` +
      `max ${String(Math.max(...sizes)).padStart(4)}  ` +
      `mean ${String(mean).padStart(4)}  ` +
      `tiny ${tiny}  orphaned headings ${orphanedHeadings(chunks)}`,
  );
}

const document = loadCorpus().find((doc) => doc.name === "deployments.md")!;
console.log(`document: ${document.name} (${document.text.length} chars)\n`);

const strategies: Record<string, Chunk[]> = {
  "fixed 120/0": chunkByCharacters(document.text, document.name, 120, 0),
  "fixed 300/0": chunkByCharacters(document.text, document.name, 300, 0),
  "fixed 300/60": chunkByCharacters(document.text, document.name, 300, 60),
  paragraph: chunkByParagraph(document.text, document.name, 500),
  section: chunkBySection(document.text, document.name),
};

for (const [label, chunks] of Object.entries(strategies)) {
  report(label, chunks);
}

// The argument, made concrete. This sentence answers "can I roll back a
// migration?" and fixed-size chunking cuts it.
const NEEDLE =
  "They are not reverted by a rollback, which is why every migration must be backwards compatible";
console.log(`\nlooking for the sentence containing ${JSON.stringify(NEEDLE)}\n`);

for (const [label, chunks] of Object.entries(strategies)) {
  // Normalise whitespace: the source wraps the sentence across two lines, and
  // a chunk boundary is about the words, not the newlines.
  const flat = (text: string) => text.replace(/\s+/g, " ");
  const hit = chunks.find((chunk) => flat(chunk.text).includes(flat(NEEDLE)));
  if (!hit) {
    console.log(
      `  ${label.padEnd(22)} SPLIT ACROSS CHUNKS - the sentence is not retrievable`,
    );
    continue;
  }
  const hasContext = hit.text.includes("#");
  console.log(
    `  ${label.padEnd(22)} intact in one chunk, ` +
      `${hasContext ? "with its heading" : "without its heading"}`,
  );
}

console.log(
  "\nA chunk that cuts a definition in half retrieves half a definition.\n" +
    "Above this: prepend document-aware context to each chunk before\n" +
    "embedding (contextual retrieval), or use a contextualised chunk model\n" +
    "such as voyage-context-4. Then add reranking. Tune chunk size last.",
);
