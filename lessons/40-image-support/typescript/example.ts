/**
 * Lesson 40 - Image support.
 *
 * Three source types, the token cost of each, and the patch formula checked
 * against countTokens.
 *
 *   npm run lesson -- 40
 *   npm run lesson -- 40 -- --image assets/images/sat1.png
 */
import { createReadStream, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { textOf } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const QUESTION = "Describe this image in one sentence.";

/** Read width/height from a PNG header - no image library needed. */
function pngDimensions(data: Buffer): { width: number; height: number } | null {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!data.subarray(0, 8).equals(signature)) return null;
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { image: { type: "string", default: "assets/images/marbles1.png" } },
});

const path = join(REPO_ROOT, values.image!);
const raw = readFileSync(path);
const encoded = raw.toString("base64");
const client = createClient();

console.log(
  `image: ${values.image}  (${Math.round(raw.length / 1024)} KB on disk, ` +
    `${Math.round(encoded.length / 1024)} KB base64)`,
);
console.log(
  "limit: 10 MB per image on the Claude API (5 MB on Bedrock/Google Cloud)\n",
);

// 1. base64 - the Academy form.
const base64Block: Anthropic.ImageBlockParam = {
  type: "image",
  source: { type: "base64", media_type: "image/png", data: encoded },
};
const base64Count = await client.messages.countTokens({
  model: MODEL,
  // Image before text: Claude works best that way.
  messages: [
    { role: "user", content: [base64Block, { type: "text", text: QUESTION }] },
  ],
});
console.log(`1. base64     ${base64Count.input_tokens} input tokens`);

// 2. Files API - the addition that matters in a multi-turn app. The Files API
//    is out of beta: client.files, no beta header.
const uploaded = await client.files.upload({
  file: await toFile(createReadStream(path), basename(path), { type: "image/png" }),
});
const fileBlock: Anthropic.ImageBlockParam = {
  type: "image",
  source: { type: "file", file_id: uploaded.id },
};
console.log(`2. file_id    uploaded as ${uploaded.id}`);
// countTokens does NOT accept a `file` source - it returns
//   400 "File sources are not supported in the token counting endpoint."
// messages.create accepts the very same block, so measure it from usage.
try {
  await client.messages.countTokens({
    model: MODEL,
    messages: [
      { role: "user", content: [fileBlock, { type: "text", text: QUESTION }] },
    ],
  });
  console.log("   countTokens accepted a file source (check the current docs)");
} catch (error) {
  if (error instanceof Anthropic.BadRequestError) {
    const detail = /"message":"([^"]+)"/.exec(error.message)?.[1] ?? error.message;
    console.log(`   countTokens refuses a file source: ${detail}`);
  } else {
    throw error;
  }
}

const response = await client.messages.create({
  model: MODEL,
  max_tokens: 300,
  messages: [{ role: "user", content: [fileBlock, { type: "text", text: QUESTION }] }],
});
console.log(
  `   measured from usage instead: ${response.usage.input_tokens} input tokens`,
);
console.log(
  "   Same token cost as base64 - the image still enters the context. What\n" +
    "   a file_id saves is RESENDING the bytes on every turn.\n",
);
console.log(`answer: ${textOf(response).trim()}\n`);

// 3. The patch formula, checked.
const dimensions = pngDimensions(raw);
if (dimensions) {
  const patches = Math.ceil(dimensions.width / 28) * Math.ceil(dimensions.height / 28);
  console.log(`dimensions:      ${dimensions.width}x${dimensions.height}`);
  console.log(`visual tokens:   ceil(w/28) * ceil(h/28) = ${patches}`);
  console.log(
    `counted tokens:  ${base64Count.input_tokens} (includes the prompt text)`,
  );
  console.log(
    "\nA model is capped by its resolution tier: 1568 visual tokens on the\n" +
      "standard tier, 4784 on high-resolution (Claude 4.7 and later). An\n" +
      "image above the cap is downscaled before processing - which is why a\n" +
      "4K screenshot costs the same as a 2576px one on the same tier.",
  );
}

// Multiple images. Over 20 in one request, a stricter per-image dimension limit
// applies to EVERY image in it - including images inside tool_result content.
const second = readFileSync(join(REPO_ROOT, "assets/images/marbles2.png"));
const both = await client.messages.create({
  model: MODEL,
  max_tokens: 300,
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Image 1:" },
        base64Block,
        { type: "text", text: "Image 2:" },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png",
            data: second.toString("base64"),
          },
        },
        { type: "text", text: "What differs between them?" },
      ],
    },
  ],
});
console.log(`\ntwo images: ${textOf(both).trim().slice(0, 300)}`);

await client.files.delete(uploaded.id);
console.log(`\ncleaned up file ${uploaded.id}`);
