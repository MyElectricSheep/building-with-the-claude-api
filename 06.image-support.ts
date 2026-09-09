/**
 * Claude Academy image support. Node.js 24+; no tsx required.
 * Setup: npm install @anthropic-ai/sdk && npm pkg set type=module
 * Put ANTHROPIC_API_KEY=your-key in .env. Run:
 *   node --env-file=.env image-support.ts --image photo.png
 *   node --env-file=.env image-support.ts --image https://example.com/photo.jpg
 *   node --env-file=.env image-support.ts --image before.jpg --image after.jpg --prompt "Compare these images."
 *   node --env-file=.env image-support.ts --image marbles.png --task count
 *   node --env-file=.env image-support.ts --image target.png --task count --example known.png --example-answer "There are 12 marbles."
 *   node --env-file=.env image-support.ts --image satellite.jpg --task property
 *
 * Local files become base64 image blocks; public URLs are fetched by Anthropic.
 * Supports JPEG, PNG, GIF, WebP. Only the first animation frame is analyzed.
 * This small demo caps requests at 100 images, including the optional example.
 * Current direct API limits differ from the lesson: 10 MB encoded per image,
 * 32 MB request body, 8000px per side; >20 images need smaller dimensions.
 * Image dimensions/decodability and remote files are validated by the API.
 * No resizing is performed. Reduce dimensions to control latency and cost.
 * The lesson's area/750 token formula is approximate; use returned usage here.
 * All selected images are sent to Anthropic. API token charges apply.
 * Sources inspected September 9, 2026:
 * https://academy.claude.com/courses/building-with-the-claude-api/image-support
 * https://platform.claude.com/docs/en/build-with-claude/vision
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFile, stat } from "node:fs/promises";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

const PROMPTS = {
  describe:
    "Describe the main subjects, setting, and visible details. Separate clear observations from uncertain interpretations.",
  count:
    "Count the marbles in each target image. Scan distinct regions without double-counting, then cross-check the total in a different order. Report the count and any obscured or ambiguous objects; do not claim certainty when the image is unclear.",
  property: `
    Analyze the attached satellite image of a property with these specific steps:

1. Residence identification: Locate the primary residence on the property by looking for:
   - The largest roofed structure
   - Typical residential features (driveway connection, regular geometry)
   - Distinction from other structures (garages, sheds, pools)

2. Tree overhang analysis: Examine all trees near the primary residence:
   - Identify any trees whose canopy extends directly over any portion of the roof
   - Estimate the percentage of roof covered by overhanging branches (0-25%, 25-50%, 50-75%, 75%+)
   - Note particularly dense areas of overhang

3. Fire risk assessment: For any overhanging trees, evaluate:
   - Potential wildfire vulnerability (ember catch points, continuous fuel paths to structure)
   - Proximity to chimneys, vents, or other roof openings if visible
   - Areas where branches create a "bridge" between wildland vegetation and the structure

4. Defensible space identification: Assess the property's overall vegetative structure:
   - Identify if trees connect to form a continuous canopy over or near the home
   - Note any obvious fuel ladders (vegetation that can carry fire from ground to tree to roof)

5. Fire risk rating: Based on your analysis, assign a Fire Risk Rating from 1-4:
   - Rating 1 (Low Risk): No tree branches overhanging the roof, good defensible space around the home
   - Rating 2 (Moderate Risk): Minimal overhang (<25% of roof), some separation between tree canopies
   - Rating 3 (High Risk): Significant overhang (25-50% of roof), connected tree canopies, multiple vulnerability points
   - Rating 4 (Severe Risk): Extensive overhang (>50% of roof), dense vegetation against structure

For each item above (1-5), write one sentence summarizing your findings, with your final response being the numerical rating.
    `,
};

export async function imageBlock(
  source: string,
): Promise<Anthropic.ImageBlockParam> {
  if (/^https?:\/\//i.test(source)) {
    const url = new URL(source);
    if (url.username || url.password)
      throw new Error("Use an image URL without embedded credentials.");
    return { type: "image", source: { type: "url", url: url.href } };
  }
  const info = await stat(source);
  if (!info.isFile() || info.size === 0)
    throw new Error(`Not a nonempty image file: ${source}`);
  if (4 * Math.ceil(info.size / 3) > 10_000_000)
    throw new Error(`Image exceeds this demo's 10 MB encoded limit: ${source}`);
  const bytes = await readFile(source);
  // Detect the format from the bytes, not the filename extension.
  let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    mediaType = "image/png";
  else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    mediaType = "image/jpeg";
  else if (["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6)))
    mediaType = "image/gif";
  else if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    mediaType = "image/webp";
  else throw new Error(`Expected JPEG, PNG, GIF, or WebP: ${source}`);
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: mediaType,
      data: bytes.toString("base64"),
    },
  };
}

export async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      image: { type: "string", multiple: true },
      task: { type: "string", default: "describe" },
      prompt: { type: "string" },
      example: { type: "string" },
      "example-answer": { type: "string" },
      model: { type: "string", default: "claude-sonnet-4-6" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(
      'Usage: node --env-file=.env image-support.ts --image PATH_OR_URL [--image ...] [--task describe|count|property] [--prompt "question"] [--example PATH_OR_URL --example-answer "known answer"] [--model ID]',
    );
    return;
  }
  const images = values.image ?? [];
  if (!images.length || images.some((image) => !image.trim()))
    throw new Error("Provide at least one --image PATH_OR_URL.");
  if (images.length + Number(values.example !== undefined) > 100)
    throw new Error(
      "This demo supports up to 100 images including the example.",
    );
  if (!Object.hasOwn(PROMPTS, values.task!))
    throw new Error("--task must be describe, count, or property.");
  if (
    (values.example !== undefined) !==
    (values["example-answer"] !== undefined)
  )
    throw new Error("Provide --example and --example-answer together.");
  if (
    values.example !== undefined &&
    (!values.example.trim() || !values["example-answer"]?.trim())
  )
    throw new Error("Example and answer cannot be empty.");
  const prompt = values.prompt ?? PROMPTS[values.task as keyof typeof PROMPTS];
  if (!prompt.trim()) throw new Error("--prompt cannot be empty.");
  if (!process.env.ANTHROPIC_API_KEY?.trim())
    throw new Error("Set ANTHROPIC_API_KEY in .env.");
  const messages: Anthropic.MessageParam[] = [];
  // One-shot demonstration: an image question and its known assistant answer.
  if (values.example) {
    messages.push({
      role: "user",
      content: [
        await imageBlock(values.example),
        { type: "text", text: prompt },
      ],
    });
    messages.push({ role: "assistant", content: values["example-answer"]! });
  }
  const content: Anthropic.ContentBlockParam[] = [];
  for (const [index, source] of images.entries()) {
    content.push(
      { type: "text", text: `Target image ${index + 1}:` },
      await imageBlock(source),
    );
  }
  // Put the actual question after the images; labels allow unambiguous comparisons.
  content.push({ type: "text", text: prompt });
  messages.push({ role: "user", content });
  const request: Anthropic.MessageCreateParamsNonStreaming = {
    model: values.model!,
    max_tokens: 2048,
    messages,
  };
  if (Buffer.byteLength(JSON.stringify(request)) > 32_000_000)
    throw new Error(
      "Request exceeds 32 MB; use fewer/smaller images or URL sources.",
    );
  const client = new Anthropic({ timeout: 120_000, maxRetries: 2 });
  const response = await client.messages.create(request);
  for (const block of response.content)
    if (block.type === "text") console.log(block.text);
  console.log(
    `\nTokens: ${response.usage.input_tokens} input (including images), ${response.usage.output_tokens} output.`,
  );
  if (response.stop_reason === "max_tokens")
    console.warn("Response truncated; increase max_tokens in this file.");
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
          : "Image analysis failed.",
    );
    process.exitCode = 1;
  });
}
