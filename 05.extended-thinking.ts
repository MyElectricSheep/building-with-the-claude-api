/**
 * Claude Academy extended thinking — Node.js 24+, no tsx needed.
 * Setup: npm install @anthropic-ai/sdk && npm pkg set type=module
 * Put ANTHROPIC_API_KEY=your-key in .env, then:
 *   node --env-file=.env extended-thinking.ts
 *   node --env-file=.env extended-thinking.ts --budget 2048 --follow-up "Check your answer."
 *   node --env-file=.env extended-thinking.ts --mode adaptive --prompt "Your question"
 *   node --env-file=.env extended-thinking.ts --mode off --prompt "Your question"
 *
 * Default model: claude-sonnet-4-6 (override with --model).
 * Manual mode matches the lesson: budget >= 1024; max_tokens > budget.
 * It is deprecated but accepted on 4.6. Models 4.7+ require adaptive mode.
 * Adaptive mode uses effort rather than budget_tokens and may skip thinking.
 * Compare modes on your own evaluations: thinking adds latency and token cost.
 * Returned thinking is a summary, not the complete internal reasoning.
 * Sources inspected September 9, 2026:
 * https://academy.claude.com/courses/building-with-the-claude-api/extended-thinking
 * https://platform.claude.com/docs/en/build-with-claude/extended-thinking
 * https://platform.claude.com/docs/en/build-with-claude/thinking
 */
import Anthropic from "@anthropic-ai/sdk";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

export function printMessage(message: Anthropic.Message): void {
  for (const block of message.content) {
    switch (block.type) {
      case "thinking":
        console.log(
          "\nThinking summary:\n" + (block.thinking || "[Summary omitted]"),
        );
        // Keep block.signature intact; it is not user-facing answer text.
        break;
      case "redacted_thinking":
        console.log(
          "\n[Redacted thinking: opaque data retained for follow-up]",
        );
        // Do not try to decode block.data or replace it with this placeholder.
        break;
      case "text":
        console.log("\nAnswer:\n" + block.text);
        break;
      default:
        console.log(`\n[${block.type} block]`);
    }
  }
  console.log(
    `\nTokens: ${message.usage.input_tokens} input, ${message.usage.output_tokens} output (includes thinking).`,
  );
  if (message.stop_reason === "max_tokens")
    console.warn("Output truncated: increase --max-tokens.");
}

export async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      mode: { type: "string", default: "manual" },
      model: { type: "string", default: "claude-sonnet-4-6" },
      budget: { type: "string", default: "2048" },
      "max-tokens": { type: "string", default: "4096" },
      prompt: {
        type: "string",
        default:
          "A bag contains 5 red, 4 blue, and 3 green balls. Three are drawn without replacement. What is the probability that exactly two have the same color? Give an exact fraction.",
      },
      "follow-up": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    console.log(
      'Usage: node --env-file=.env extended-thinking.ts [--mode manual|adaptive|off] [--model ID] [--budget 2048] [--max-tokens 4096] [--prompt "question"] [--follow-up "question"]',
    );
    return;
  }
  const mode = values.mode;
  if (!["manual", "adaptive", "off"].includes(mode!))
    throw new Error("--mode must be manual, adaptive, or off.");
  const budget = Number(values.budget),
    maxTokens = Number(values["max-tokens"]);
  if (!Number.isSafeInteger(maxTokens) || maxTokens < 1)
    throw new Error("--max-tokens must be a positive integer.");
  if (
    mode === "manual" &&
    (!Number.isSafeInteger(budget) || budget < 1024 || budget >= maxTokens)
  ) {
    throw new Error("Manual mode requires 1024 <= budget < max-tokens.");
  }
  if (
    !values.prompt?.trim() ||
    (values["follow-up"] !== undefined && !values["follow-up"].trim())
  ) {
    throw new Error("Questions cannot be empty.");
  }
  if (!process.env.ANTHROPIC_API_KEY?.trim())
    throw new Error("Set ANTHROPIC_API_KEY in .env.");
  const client = new Anthropic({ timeout: 120_000, maxRetries: 2 });
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: values.prompt },
  ];
  const chat = () =>
    client.messages.create({
      model: values.model!,
      max_tokens: maxTokens,
      messages,
      thinking:
        mode === "manual"
          ? { type: "enabled", budget_tokens: budget, display: "summarized" }
          : mode === "adaptive"
            ? { type: "adaptive", display: "summarized" }
            : { type: "disabled" },
      ...(mode === "adaptive"
        ? { output_config: { effort: "high" as const } }
        : {}),
      // Omit temperature, top_p, top_k, and assistant prefilling for compatibility.
    });
  const response = await chat();
  printMessage(response);
  if (values["follow-up"]) {
    if (response.stop_reason !== "end_turn")
      throw new Error(
        "Follow-up skipped: the first response did not complete normally.",
      );
    // Preserve ALL blocks, their order, signatures, and redacted data unchanged.
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: values["follow-up"] });
    printMessage(await chat());
  }
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
          : "Request failed.",
    );
    process.exitCode = 1;
  });
}
