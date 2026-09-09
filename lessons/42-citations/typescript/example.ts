/**
 * Lesson 42 - Citations.
 *
 * Cited answers, a verification pass that actually checks the spans, and the one
 * new incompatibility: citations plus output_config.format is a 400.
 *
 *   npm run lesson -- 42
 */
import Anthropic from "@anthropic-ai/sdk";
import { textOf } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";
import { loadCorpus } from "../../../shared/typescript/corpus.ts";

const QUESTION =
  "What are the severity levels, and what is the deadline for the retrospective?";

const client = createClient();
const corpus = new Map(loadCorpus().map((doc) => [doc.name, doc.text]));
const chosen = ["incidents.md", "on-call.md"];

// citations is all-or-nothing across the documents in a request.
const content: Anthropic.ContentBlockParam[] = chosen.map((name) => ({
  type: "document",
  source: { type: "text", media_type: "text/plain", data: corpus.get(name)! },
  title: name,
  citations: { enabled: true },
}));
content.push({ type: "text", text: QUESTION });

const response = await client.messages.create({
  model: MODEL,
  max_tokens: 800,
  system: "Answer from the documents. Cite what you use.",
  messages: [{ role: "user", content }],
});

console.log("=== answer ===");
console.log(textOf(response).trim());

console.log("\n=== citations, verified against the source ===");
let checked = 0;
let mismatched = 0;
for (const block of response.content) {
  if (block.type !== "text" || !block.citations) continue;
  for (const citation of block.citations) {
    checked += 1;
    // Branch on the location type. A PDF citation has no char indices.
    let where: string;
    let title = "?";
    let quoted = "";
    switch (citation.type) {
      case "char_location":
        where = `chars ${citation.start_char_index}-${citation.end_char_index}`;
        title = citation.document_title ?? "?";
        quoted = citation.cited_text;
        break;
      case "page_location":
        where = `p${citation.start_page_number}-${citation.end_page_number}`;
        title = citation.document_title ?? "?";
        quoted = citation.cited_text;
        break;
      case "web_search_result_location":
        where = citation.url;
        title = citation.title ?? "?";
        quoted = citation.cited_text ?? "";
        break;
      default:
        where = citation.type;
    }

    // THE check almost nobody writes: does the cited span actually appear in
    // the document it claims to come from?
    const source = corpus.get(title) ?? "";
    const verified = quoted.trim().length > 0 && source.includes(quoted.trim());
    if (!verified) mismatched += 1;
    console.log(`  [${verified ? "ok " : "MISMATCH"}] ${title} ${where}`);
    console.log(`          ${quoted.trim().slice(0, 110)}`);
  }
}

console.log(
  `\n${checked} citation(s) checked, ${mismatched} did not match the source.`,
);
console.log(
  "A citation is a pointer, not a paraphrase - so it is checkable, and\n" +
    "checking it is the entire reason to turn citations on.",
);

console.log("\n=== citations + output_config.format ===");
try {
  await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [{ role: "user", content }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: { answer: { type: "string" } },
          required: ["answer"],
          additionalProperties: false,
        },
      },
    },
  });
  console.log("  (accepted - check whether this restriction still applies)");
} catch (error) {
  if (error instanceof Anthropic.BadRequestError) {
    console.log(`  400: ${error.message}`);
    console.log(
      "\n  You have to choose per request: verifiable spans OR a guaranteed\n" +
        "  shape. The usual resolution is two calls - a cited answer for the\n" +
        "  human, a structured extraction for the machine.",
    );
  } else {
    throw error;
  }
}
