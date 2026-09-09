/**
 * Claude Academy PDF support. Node.js 24+; no tsx required.
 * Setup: npm install @anthropic-ai/sdk && npm pkg set type=module
 * Put ANTHROPIC_API_KEY=your-key in .env, then:
 *   node --env-file=.env 07.pdf-support.ts --pdf pdf/earth.pdf
 *   node --env-file=.env 07.pdf-support.ts --pdf pdf/earth.pdf --prompt "Which number in the solar system does Earth have?"
 *   node --env-file=.env 07.pdf-support.ts --pdf https://example.com/report.pdf
 *   node --env-file=.env 07.pdf-support.ts --pdf first.pdf --pdf second.pdf --prompt "Compare these documents."
 *
 * As in the lesson, encode the PDF as base64 and use a document block with
 * application/pdf, followed by the question. Claude processes page text AND
 * visuals, including charts/tables; no local text extraction is needed.
 * URL sources are fetched by Anthropic and must be accessible to its servers.
 * The script checks local headers and request size, not PDF validity, encryption,
 * or page count; the API validates those. Use unencrypted standard PDFs.
 * Current direct API limits: 32 MB per request; 600 pages, or 100 with context
 * windows below 1M tokens. Dense documents can exceed context limits earlier.
 * Base64 adds about 33% to file size. Split large documents before running.
 * Selected documents are sent to Anthropic; text and page images incur tokens.
 * Citations are enabled on every document. Answer markers point to source
 * quotes and locations. PDF pages are 1-based; API end pages are exclusive.
 * Plain-text citations use 0-based character ranges with exclusive ends.
 * Scanned PDFs without extractable text cannot supply text citations.
 *   node --env-file=.env 07.pdf-support.ts --text article.txt --prompt "What are the main claims?"
 * Mix --pdf and --text freely; PDFs are indexed first, then text files.
 * Sources inspected September 9, 2026:
 * https://academy.claude.com/courses/building-with-the-claude-api/pdf-support
 * https://platform.claude.com/docs/en/build-with-claude/pdf-support
 * https://academy.claude.com/courses/building-with-the-claude-api/citations
 * https://platform.claude.com/docs/en/build-with-claude/citations
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFile, stat } from "node:fs/promises";
import { parseArgs } from "node:util";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";

export async function pdfBlock(
  source: string,
  title: string,
): Promise<Anthropic.DocumentBlockParam> {
  if (/^https?:\/\//i.test(source)) {
    const url = new URL(source);
    if (url.username || url.password)
      throw new Error("Use a PDF URL without embedded credentials.");
    return {
      type: "document",
      title,
      citations: { enabled: true },
      source: { type: "url", url: url.href },
    };
  }
  const info = await stat(source);
  if (!info.isFile() || info.size === 0)
    throw new Error(`Not a nonempty PDF file: ${source}`);
  if (4 * Math.ceil(info.size / 3) >= 32_000_000)
    throw new Error(`PDF is too large to embed: ${source}`);
  const bytes = await readFile(source);
  if (!bytes.subarray(0, 1024).includes(Buffer.from("%PDF-")))
    throw new Error(`PDF header not found: ${source}`);
  return {
    type: "document",
    title,
    citations: { enabled: true },
    source: {
      type: "base64",
      media_type: "application/pdf",
      data: bytes.toString("base64"),
    },
  };
}

// Keep citations attached to their original text blocks, rather than flattening
// the answer and losing which claim each reference supports.
export function formatAnswer(response: Anthropic.Message): string {
  const references: string[] = [];
  const answer = response.content
    .filter((block) => block.type === "text")
    .map((block) => {
      const markers = (block.citations ?? []).map((citation) => {
        let location: string;
        if (citation.type === "page_location") {
          const lastPage = citation.end_page_number - 1;
          location =
            lastPage === citation.start_page_number
              ? `page ${lastPage}`
              : `pages ${citation.start_page_number}–${lastPage}`;
        } else if (citation.type === "char_location") {
          location = `characters [${citation.start_char_index}, ${citation.end_char_index}) (0-based, end exclusive)`;
        } else if (citation.type === "content_block_location") {
          location = `blocks [${citation.start_block_index}, ${citation.end_block_index})`;
        } else {
          // Not expected for this document-only request; retain unfamiliar details.
          references.push(JSON.stringify(citation));
          return `[${references.length}]`;
        }
        references.push(
          `Document ${citation.document_index + 1}: ${citation.document_title ?? "(untitled)"}, ${location}\n  Quote: ${JSON.stringify(citation.cited_text)}`,
        );
        return `[${references.length}]`;
      });
      return block.text + markers.join("");
    })
    .join("");
  if (!answer.trim())
    throw new Error(`No text returned (stop reason: ${response.stop_reason}).`);
  return (
    answer +
    (references.length
      ? "\n\nSources:\n" +
        references.map((reference, i) => `[${i + 1}] ${reference}`).join("\n")
      : "\n\n[No citations returned for this answer.]")
  );
}

function sourceTitle(source: string): string {
  // Avoid exposing URL query strings (which can contain access tokens) in titles.
  return /^https?:\/\//i.test(source)
    ? basename(new URL(source).pathname) || "Remote PDF"
    : basename(source);
}

export async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      pdf: { type: "string", multiple: true },
      text: { type: "string", multiple: true },
      prompt: {
        type: "string",
        default: "Summarize each document in one sentence.",
      },
      model: { type: "string", default: "claude-sonnet-4-6" },
      "max-tokens": { type: "string", default: "2048" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(
      'Usage: node --env-file=.env pdf-support.ts [--pdf PATH_OR_URL ...] [--text LOCAL_FILE ...] [--prompt "question"] [--model ID] [--max-tokens 2048]',
    );
    return;
  }
  const sources = values.pdf ?? [];
  const textFiles = values.text ?? [];
  if (
    !(sources.length + textFiles.length) ||
    [...sources, ...textFiles].some((source) => !source.trim())
  )
    throw new Error(
      "Provide at least one --pdf PATH_OR_URL or --text LOCAL_FILE.",
    );
  if (!values.prompt?.trim()) throw new Error("--prompt cannot be empty.");
  const maxTokens = Number(values["max-tokens"]);
  if (!Number.isSafeInteger(maxTokens) || maxTokens < 1)
    throw new Error("--max-tokens must be a positive integer.");
  if (!process.env.ANTHROPIC_API_KEY?.trim())
    throw new Error("Set ANTHROPIC_API_KEY in .env.");
  const content: Anthropic.ContentBlockParam[] = [];
  for (const source of sources)
    content.push(await pdfBlock(source, sourceTitle(source)));
  for (const source of textFiles) {
    const info = await stat(source);
    if (!info.isFile() || info.size > 32_000_000)
      throw new Error(`Invalid or oversized text file: ${source}`);
    const data = await readFile(source, "utf8");
    if (!data.trim()) throw new Error(`Empty text file: ${source}`);
    content.push({
      type: "document",
      title: basename(source),
      citations: { enabled: true },
      source: { type: "text", media_type: "text/plain", data },
    });
  }
  content.push({ type: "text", text: values.prompt }); // Documents before question.
  const request: Anthropic.MessageCreateParamsNonStreaming = {
    model: values.model!,
    max_tokens: maxTokens,
    system:
      "Answer from the supplied documents and cite supporting passages using the citations feature. If the documents do not support an answer, say so.",
    messages: [{ role: "user", content }],
  };
  if (Buffer.byteLength(JSON.stringify(request)) > 32_000_000)
    throw new Error(
      "Request exceeds 32 MB; use fewer/smaller PDFs or URL sources.",
    );
  const client = new Anthropic({ timeout: 120_000, maxRetries: 2 });
  const response = await client.messages.create(request);
  console.log(formatAnswer(response));
  console.log(
    `\nTokens: ${response.usage.input_tokens} input (including PDFs), ${response.usage.output_tokens} output.`,
  );
  if (response.stop_reason === "max_tokens")
    console.warn("Response truncated; increase --max-tokens.");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(
      error instanceof Anthropic.APIError
        ? `Anthropic HTTP ${error.status ?? "unknown"}: ${error.message}`
        : error instanceof Error
          ? error.message
          : "PDF analysis failed.",
    );
    process.exitCode = 1;
  });
}
