import type Anthropic from "@anthropic-ai/sdk";

/**
 * Content-block helpers.
 *
 * The single most important 2026 correction to the Academy course: a Claude
 * response is a *list of typed blocks*, not "text at index 0". Current models
 * run adaptive thinking by default, so `response.content[0]` is frequently a
 * `thinking` block, and `response.content[1]` is not reliably the tool call.
 *
 * Every helper here narrows on `block.type`. None of them index by position.
 *
 * Docs: https://platform.claude.com/docs/en/build-with-claude/working-with-messages
 */

/** Concatenate every `text` block. Returns "" when the turn produced none. */
export function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/** Every `tool_use` block in the turn, in order. May be empty. */
export function toolUses(message: Anthropic.Message): Anthropic.ToolUseBlock[] {
  return message.content.filter((block) => block.type === "tool_use");
}

/** Thinking summaries, when `thinking.display` is set to "summarized". */
export function thinkingOf(message: Anthropic.Message): string[] {
  return message.content
    .filter((block) => block.type === "thinking")
    .map((block) => block.thinking)
    .filter((text) => text.length > 0);
}

/** A compact `type` census, useful for showing students what came back. */
export function blockTypes(message: Anthropic.Message): string[] {
  return message.content.map((block) => block.type);
}

/**
 * Parse a structured-output response.
 *
 * With `output_config.format`, the model is constrained to emit JSON matching
 * the schema, but you still have to defend against a non-`end_turn` stop:
 * a refusal or a `max_tokens` truncation yields text that will not parse.
 */
export function parseStructured<T>(message: Anthropic.Message): T {
  if (message.stop_reason === "refusal") {
    const details = message.stop_details;
    throw new Error(
      `Model refused the request` +
        (details && "category" in details ? ` (${details.category})` : ""),
    );
  }
  if (message.stop_reason !== "end_turn") {
    throw new Error(
      `Response did not complete (stop_reason: ${message.stop_reason}); ` +
        `raise max_tokens or shorten the request before parsing JSON.`,
    );
  }
  return JSON.parse(textOf(message)) as T;
}

/**
 * Append an assistant turn to a conversation, preserving every block.
 *
 * Do not collapse the turn to its text: thinking blocks and tool_use blocks
 * must be echoed back verbatim or the next request loses the model's state.
 */
export function appendAssistantTurn(
  messages: Anthropic.MessageParam[],
  message: Anthropic.Message,
): void {
  messages.push({ role: "assistant", content: message.content });
}

/** Pretty-print token usage, including the cache counters. */
export function formatUsage(usage: Anthropic.Usage): string {
  const parts = [`${usage.input_tokens} in`, `${usage.output_tokens} out`];
  if (usage.cache_creation_input_tokens) {
    parts.push(`${usage.cache_creation_input_tokens} cache write`);
  }
  if (usage.cache_read_input_tokens) {
    parts.push(`${usage.cache_read_input_tokens} cache read`);
  }
  return parts.join(", ");
}
