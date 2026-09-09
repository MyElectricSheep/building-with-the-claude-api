/**
 * Loading and chunking the small documentation corpus used by lessons 32-38.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chunkBySection } from "./chunking.ts";
import type { Chunk } from "./chunking.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORPUS_DIR = join(REPO_ROOT, "assets", "corpus");

export interface Document {
  name: string;
  text: string;
}

export function loadCorpus(): Document[] {
  return readdirSync(CORPUS_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => ({
      name,
      text: readFileSync(join(CORPUS_DIR, name), "utf8"),
    }));
}

/** Section-aware chunks across the whole corpus. */
export function loadChunks(): Chunk[] {
  return loadCorpus().flatMap((document) =>
    chunkBySection(document.text, document.name),
  );
}

/**
 * Questions used to compare retrieval strategies across lessons 34-38.
 *
 * `expect` is the file that actually answers the question. Deliberately mixed:
 * some are paraphrases (semantic search wins), some hinge on an exact term
 * (lexical search wins), and one is answered by no document at all.
 */
export const QUESTIONS: { question: string; expect: string | null }[] = [
  { question: "How long before I can touch production?", expect: "onboarding.md" },
  {
    question: "What is the ticket type for production access?",
    expect: "onboarding.md",
  },
  {
    question: "Can I put a database migration through a rollback?",
    expect: "deployments.md",
  },
  { question: "What does SEV2 mean?", expect: "incidents.md" },
  {
    question: "How much can I spend on dinner abroad without asking?",
    expect: "expenses.md",
  },
  { question: "When does the on-call handover happen?", expect: "on-call.md" },
  { question: "What is the company's parental leave policy?", expect: null },
];
