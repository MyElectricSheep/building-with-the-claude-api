/**
 * Lesson 45 - Prompt caching in action.
 *
 * The reminder agent run three ways - no caching, automatic, explicit - with
 * real token costs. The interesting column is cache_read on iterations 2+: that
 * is where an agent gets its money back.
 *
 *   npm run lesson -- 45
 */
import type Anthropic from "@anthropic-ai/sdk";
import { appendAssistantTurn, toolUses } from "../../../shared/typescript/blocks.ts";
import { createClient } from "../../../shared/typescript/client.ts";
import { MODEL } from "../../../shared/typescript/config.ts";
import { loadCorpus } from "../../../shared/typescript/corpus.ts";
import {
  ReminderStore,
  TOOL_DEFINITIONS,
  executeTool,
} from "../../../shared/typescript/tools.ts";

const REQUEST = "Remind me to renew the SSO certificate a week from now.";

/** Large enough to clear the minimum cacheable prefix. */
function bigSystem(): string {
  const corpus = loadCorpus()
    .map((doc) => `# ${doc.name}\n${doc.text}`)
    .join("\n\n");
  const body = `${corpus}\n\n`.repeat(4);
  return (
    "You are an assistant for this company. Use the tools to schedule " +
    `reminders. Handbook for reference:\n\n<handbook>\n${body}</handbook>`
  );
}

interface Cost {
  uncached: number;
  written: number;
  read: number;
  turns: number;
}

/** Rough relative cost: writes ~1.25x, reads ~0.1x a normal input token. */
const billedEquivalent = (cost: Cost) =>
  cost.uncached + cost.written * 1.25 + cost.read * 0.1;

const client = createClient();
const systemText = bigSystem();

/**
 * A breakpoint on the LAST tool caches the whole tool block. Render order is
 * tools -> system -> messages, so this covers everything before it.
 */
function explicitTools(ttl?: "1h"): Anthropic.Tool[] {
  const tools = TOOL_DEFINITIONS.map((tool) => ({ ...tool }));
  const last = tools[tools.length - 1]!;
  last.cache_control = ttl ? { type: "ephemeral", ttl } : { type: "ephemeral" };
  return tools;
}

async function runAgent(
  label: string,
  params: {
    system: Anthropic.MessageCreateParams["system"];
    tools: Anthropic.Tool[];
    // Narrowly typed: widening this to Partial<MessageCreateParams> would make
    // the create() overload ambiguous between streaming and non-streaming.
    extra?: { cache_control?: Anthropic.CacheControlEphemeral };
  },
): Promise<void> {
  const store = new ReminderStore();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: REQUEST }];
  const cost: Cost = { uncached: 0, written: 0, read: 0, turns: 0 };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: params.system,
      tools: params.tools,
      messages,
      ...(params.extra ?? {}),
    });
    cost.uncached += response.usage.input_tokens;
    cost.written += response.usage.cache_creation_input_tokens ?? 0;
    cost.read += response.usage.cache_read_input_tokens ?? 0;
    cost.turns += 1;
    appendAssistantTurn(messages, response);

    const calls = toolUses(response);
    if (calls.length === 0) break;

    const results: Anthropic.ToolResultBlockParam[] = calls.map((call) => {
      try {
        return {
          type: "tool_result",
          tool_use_id: call.id,
          content: JSON.stringify(executeTool(call.name, call.input, store)),
        };
      } catch (error) {
        return {
          type: "tool_result",
          tool_use_id: call.id,
          content: error instanceof Error ? error.message : String(error),
          is_error: true,
        };
      }
    });
    messages.push({ role: "user", content: results });
  }

  console.log(
    `${label.padEnd(26)} turns ${cost.turns}  ` +
      `uncached ${String(cost.uncached).padStart(7)}  ` +
      `write ${String(cost.written).padStart(7)}  ` +
      `read ${String(cost.read).padStart(7)}  ` +
      `~billed ${Math.round(billedEquivalent(cost)).toLocaleString("en-US").padStart(9)}`,
  );
}

console.log("agent loop, same request, three caching strategies\n");

await runAgent("1. no caching", {
  system: systemText,
  tools: TOOL_DEFINITIONS,
});
await runAgent("2. automatic (top-level)", {
  system: systemText,
  tools: TOOL_DEFINITIONS,
  extra: { cache_control: { type: "ephemeral" } },
});
await runAgent("3. explicit breakpoints", {
  system: [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }],
  tools: explicitTools(),
});
await runAgent("4. explicit, ttl=1h", {
  system: [
    {
      type: "text",
      text: systemText,
      cache_control: { type: "ephemeral", ttl: "1h" },
    },
  ],
  tools: explicitTools("1h"),
});

console.log(
  "\n~billed is a rough relative figure: writes ~1.25x, reads ~0.1x a\n" +
    "normal input token. Run 1 pays full price on every iteration. Runs 2-4\n" +
    "pay a write once and reads afterwards - which is exactly the shape of\n" +
    "an agent loop, where tools and system are identical every turn.\n\n" +
    "A 1h TTL costs more to write, so it pays only if you get enough reads\n" +
    "inside the hour to beat several 5-minute writes.",
);
