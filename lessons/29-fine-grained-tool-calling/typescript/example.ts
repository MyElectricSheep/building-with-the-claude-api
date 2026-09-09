/**
 * Lesson 29 - Fine-grained tool streaming.
 *
 * `fine_grained=true` is gone. The control is `eager_input_streaming: true` on
 * the individual tool, with the ordinary streaming client - no beta header.
 *
 *   npm run lesson -- 29
 */
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";

const PROMPT =
  "Write a file called changelog.md containing a plausible 20-line changelog " +
  "for a SQL migration formatter. Use the write_file tool.";

function writeFileTool(eager: boolean): Anthropic.Tool {
  return {
    name: "write_file",
    description: "Write contents to a file.",
    // The 2026 control. Per tool, not per request. No beta header.
    ...(eager ? { eager_input_streaming: true } : {}),
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string" },
        contents: { type: "string" },
      },
      required: ["path", "contents"],
      additionalProperties: false,
    },
  };
}

const client = createClient();

async function streamOnce(eager: boolean): Promise<void> {
  const label = eager ? "eager_input_streaming: true" : "buffered (default)";
  console.log(`--- ${label} ---`);

  // Accumulate by CONTENT BLOCK INDEX. A turn with two tool calls interleaves
  // two streams; a single string buffer would splice them together.
  const buffers = new Map<number, string>();
  const parsed = new Map<number, { path?: string; contents?: string }>();
  let fragments = 0;
  const started = Date.now();
  let firstFragmentAt: number | null = null;
  let midStreamParseFailed = false;

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    tools: [writeFileTool(eager)],
    messages: [{ role: "user", content: PROMPT }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_start") {
      buffers.set(event.index, "");
    } else if (event.type === "content_block_delta") {
      if (event.delta.type === "input_json_delta") {
        fragments += 1;
        firstFragmentAt ??= Date.now() - started;
        buffers.set(
          event.index,
          (buffers.get(event.index) ?? "") + event.delta.partial_json,
        );

        // Deliberately try to parse halfway through, once, to show why you must
        // not. NEVER do this in real code.
        if (fragments === 8 && !midStreamParseFailed) {
          try {
            JSON.parse(buffers.get(event.index) ?? "");
          } catch (error) {
            midStreamParseFailed = true;
            const message = error instanceof Error ? error.message : String(error);
            console.log(`  mid-stream parse at fragment 8: ${message}`);
          }
        }
      }
    } else if (event.type === "content_block_stop") {
      // Parse ONLY here, when the block is complete.
      const raw = buffers.get(event.index);
      if (raw) {
        try {
          parsed.set(event.index, JSON.parse(raw));
        } catch {
          console.log(`  block ${event.index} never became valid JSON`);
        }
      }
    }
  }

  await stream.finalMessage();
  const elapsed = Date.now() - started;
  const payload = [...parsed.values()].reduce(
    (total, value) => total + (value.contents?.length ?? 0),
    0,
  );
  console.log(`  input_json_delta events: ${fragments}`);
  console.log(`  first fragment after:    ${firstFragmentAt ?? 0} ms`);
  console.log(`  total:                   ${elapsed} ms`);
  console.log(`  payload:                 ${payload} chars`);
  console.log(
    `  fragments per KB:        ${payload > 0 ? ((fragments * 1024) / payload).toFixed(1) : "n/a"}`,
  );
  for (const [index, value] of parsed) {
    console.log(`  block ${index}: path=${JSON.stringify(value.path)}`);
  }
  console.log();
}

await streamOnce(false);
await streamOnce(true);
console.log(
  "Read those timings with care: the two runs generate DIFFERENT changelogs,\n" +
    "so this is one sample of two different payloads, not a benchmark. Compare\n" +
    "`fragments per KB`, and re-run a few times before believing any gap.\n\n" +
    "What eager_input_streaming actually changes is that the API stops waiting\n" +
    "to validate JSON before emitting - it does NOT promise more, smaller\n" +
    "chunks, and you may well see fewer, larger ones.\n\n" +
    "The unambiguous demonstration is the mid-stream parse above: it fails in\n" +
    "both modes. Accumulate by event.index and parse only at content_block_stop.\n" +
    "Partial JSON is not safe to execute, and a truncated eager stream may\n" +
    "never become valid at all.",
);
