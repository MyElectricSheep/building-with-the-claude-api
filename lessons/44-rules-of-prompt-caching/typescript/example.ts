/**
 * Lesson 44 - Rules of prompt caching.
 *
 * Mostly a structural analysis: build four request shapes, predict which will
 * cache, then confirm the prediction against usage. Pass --offline to skip the
 * API.
 *
 *   npm run lesson -- 44
 *   npm run lesson -- 44 -- --offline
 */
import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import {
  auditPrefix,
  likelyBelowMinimum,
} from "../../../shared/typescript/cacheaudit.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";
import { loadCorpus } from "../../../shared/typescript/corpus.ts";
import { TOOL_DEFINITIONS } from "../../../shared/typescript/tools.ts";

const QUESTION = "When does the on-call handover happen?";

interface Shape {
  system: string;
  tools: Anthropic.Tool[] | null;
}

function handbook(): string {
  const corpus = loadCorpus()
    .map((doc) => `# ${doc.name}\n${doc.text}`)
    .join("\n\n");
  return `${corpus}\n\n`.repeat(4);
}

function shapes(): Record<string, Shape> {
  const body = handbook();
  const now = new Date().toISOString();
  return {
    "stable, large": {
      system: `Answer from the handbook.\n\n${body}`,
      tools: null,
    },
    "stable, too small": { system: "Answer from the handbook.", tools: null },
    "timestamp in system": {
      system: `Current time: ${now}\nAnswer from the handbook.\n\n${body}`,
      tools: null,
    },
    "uuid + unsorted tools": {
      system: `Trace ${randomUUID()}\nAnswer from the handbook.\n\n${body}`,
      tools: [...TOOL_DEFINITIONS].reverse(),
    },
  };
}

/** Static prediction: which shapes should cache? */
function analyse(): Record<string, boolean> {
  const predictions: Record<string, boolean> = {};
  console.log("=== static analysis (no API calls) ===\n");
  for (const [label, shape] of Object.entries(shapes())) {
    const findings = auditPrefix({
      tools: shape.tools ?? undefined,
      system: shape.system,
      stableMessages: [],
    });
    const tooSmall = likelyBelowMinimum(shape.system);
    const willCache = findings.length === 0 && !tooSmall;
    predictions[label] = willCache;

    console.log(label);
    console.log(
      `  system ~${Math.floor(shape.system.length / 4)} tokens (rough estimate)`,
    );
    if (tooSmall) {
      console.log("  [problem] below the minimum cacheable prefix (1024-4096 tokens)");
    }
    for (const finding of findings) {
      console.log(`  [problem] ${finding.where}: ${finding.problem}`);
    }
    console.log(`  -> predicted to cache: ${willCache}\n`);
  }
  return predictions;
}

const predictions = analyse();

if (process.argv.includes("--offline")) {
  console.log("--offline: skipping the confirmation requests.");
} else {
  console.log("=== confirming against usage (2 requests per shape) ===\n");
  const client = createClient();
  for (const [label, shape] of Object.entries(shapes())) {
    let reads = 0;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 120,
        cache_control: { type: "ephemeral" },
        system: shape.system,
        messages: [{ role: "user", content: QUESTION }],
        ...(shape.tools ? { tools: shape.tools } : {}),
      });
      reads = response.usage.cache_read_input_tokens ?? 0;
    }
    const cached = reads > 0;
    const mark = cached === predictions[label] ? "as predicted" : "PREDICTION WRONG";
    console.log(
      `  ${label.padEnd(24)} cache_read on request 2: ${String(reads).padStart(6)}   ${mark}`,
    );
  }

  console.log(
    "\nExplicit block-level breakpoints were not removed - they are the tool\n" +
      "for precise placement (a huge fixed document, a large static tool list,\n" +
      "sections with different TTLs). Top-level cache_control is the default.",
  );
}
