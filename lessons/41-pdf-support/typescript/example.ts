/**
 * Lesson 41 - PDF support.
 *
 * Base64, Files API, and citations. The Files API is the addition that matters:
 * ask three questions about one document without resending the bytes three
 * times.
 *
 *   npm run lesson -- 41
 */
import { createReadStream, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type Anthropic from "@anthropic-ai/sdk";
import { toFile } from "@anthropic-ai/sdk";
import { textOf } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const PDF_PATH = join(REPO_ROOT, "assets", "pdf", "earth.pdf");

const QUESTIONS = [
  "What is this document about? One sentence.",
  "Name one specific figure or measurement it gives.",
  "What is the document's structure - what are its main sections?",
];

const client = createClient();
const raw = readFileSync(PDF_PATH);
// No newlines in the base64 payload - Buffer.toString("base64") adds none.
const encoded = raw.toString("base64");

console.log(`pdf: ${basename(PDF_PATH)}  (${Math.round(raw.length / 1024)} KB)`);
console.log("limits: 100 pages on 200k-context models, up to 600 otherwise;");
console.log("        32 MB request size, which usually binds first.\n");

// 1. base64 - the Academy form. Document block BEFORE the text block.
const base64Block: Anthropic.DocumentBlockParam = {
  type: "document",
  source: { type: "base64", media_type: "application/pdf", data: encoded },
};
const base64Count = await client.messages.countTokens({
  model: MODEL,
  messages: [
    { role: "user", content: [base64Block, { type: "text", text: QUESTIONS[0]! }] },
  ],
});
console.log(`1. base64   ${base64Count.input_tokens} input tokens per request`);

// 2. Files API - out of beta, so client.files with no beta header.
const uploaded = await client.files.upload({
  file: await toFile(createReadStream(PDF_PATH), basename(PDF_PATH), {
    type: "application/pdf",
  }),
});
const fileBlock: Anthropic.DocumentBlockParam = {
  type: "document",
  source: { type: "file", file_id: uploaded.id },
};
console.log(`2. file_id  uploaded as ${uploaded.id}\n`);

console.log("three questions against the same file_id:");
for (const question of QUESTIONS) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [
      { role: "user", content: [fileBlock, { type: "text", text: question }] },
    ],
  });
  console.log(`  Q: ${question}`);
  console.log(`     ${textOf(response).trim().slice(0, 220)}`);
}

console.log(
  `\n  With base64 that would have re-uploaded ${Math.round(encoded.length / 1024)} KB ` +
    "three times.\n  The token cost is the same either way - what a file_id " +
    "saves is the upload.\n",
);

// 3. Citations. Page-level spans you can check.
// NOTE: citations cannot be combined with output_config.format (400).
const citedBlock: Anthropic.DocumentBlockParam = {
  ...fileBlock,
  citations: { enabled: true },
};
const cited = await client.messages.create({
  model: MODEL,
  max_tokens: 600,
  messages: [
    {
      role: "user",
      content: [
        citedBlock,
        { type: "text", text: "Give two specific facts from this document." },
      ],
    },
  ],
});
console.log("3. citations");
console.log(`   ${textOf(cited).trim().slice(0, 300)}\n`);
for (const block of cited.content) {
  if (block.type !== "text" || !block.citations) continue;
  for (const citation of block.citations) {
    if (citation.type !== "page_location") continue;
    console.log(
      `   p${citation.start_page_number}-${citation.end_page_number}: ` +
        `${citation.cited_text.slice(0, 90)}...`,
    );
  }
}

await client.files.delete(uploaded.id);
console.log(`\ncleaned up file ${uploaded.id}`);
