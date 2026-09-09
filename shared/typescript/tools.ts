/**
 * The reminder-agent tools used across lessons 20-28.
 *
 * The Academy builds the same project: Claude picks among a datetime tool, a
 * date-arithmetic tool, and a "create a reminder" tool. That project is still a
 * good vehicle for learning tool use, so this repository keeps it.
 *
 * Two things are different from the course version:
 *
 *   1. Every schema sets `strict: true` and `additionalProperties: false`, so
 *      Claude's arguments are guaranteed to validate (lesson 23).
 *   2. The implementations validate their own inputs anyway. `strict` guarantees
 *      the *shape*; it does not guarantee the values make sense, and it does not
 *      authorise anything.
 *
 * The functions are pure enough to unit test - `getCurrentDatetime` takes an
 * injectable clock - so lesson 22 runs with no credentials.
 */
import type Anthropic from "@anthropic-ai/sdk";

export const DURATION_UNITS = ["minutes", "hours", "days", "weeks"] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

const UNIT_MS: Record<DurationUnit, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
  weeks: 604_800_000,
};

/** Current UTC time, ISO 8601. The clock is injectable so tests are stable. */
export function getCurrentDatetime(now: Date = new Date()): string {
  return now.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Shift an ISO 8601 instant by a signed amount of a named unit. */
export function addDurationToDatetime(
  datetime: string,
  amount: number,
  unit: DurationUnit,
): string {
  const base = new Date(datetime);
  if (Number.isNaN(base.getTime())) {
    throw new Error(`Not a valid ISO 8601 datetime: ${datetime}`);
  }
  if (!Number.isFinite(amount)) {
    throw new Error("amount must be a finite number");
  }
  if (!DURATION_UNITS.includes(unit)) {
    throw new Error(`Unknown unit: ${unit}`);
  }
  const shifted = new Date(base.getTime() + amount * UNIT_MS[unit]);
  return getCurrentDatetime(shifted);
}

export interface Reminder {
  id: string;
  text: string;
  remindAt: string;
}

/**
 * A deliberately in-memory store. Lesson 27 talks about why a *mutating* tool
 * needs idempotency and authorisation checks that `strict` does not give you.
 */
export class ReminderStore {
  private readonly reminders: Reminder[] = [];

  setReminder(text: string, remindAt: string): Reminder {
    const trimmed = text.trim();
    if (trimmed.length === 0) throw new Error("Reminder text cannot be empty");
    if (Number.isNaN(new Date(remindAt).getTime())) {
      throw new Error(`Not a valid ISO 8601 datetime: ${remindAt}`);
    }
    // Idempotency: the same text at the same instant is one reminder, not two.
    // Without this, a retried request silently doubles up.
    const existing = this.reminders.find(
      (reminder) => reminder.text === trimmed && reminder.remindAt === remindAt,
    );
    if (existing) return existing;

    const reminder: Reminder = {
      id: `rem_${this.reminders.length + 1}`,
      text: trimmed,
      remindAt,
    };
    this.reminders.push(reminder);
    return reminder;
  }

  list(): readonly Reminder[] {
    return this.reminders;
  }
}

/**
 * Tool definitions.
 *
 * `strict: true` is the 2026 addition the Academy predates: it turns the schema
 * into a generation constraint rather than a hope. It requires `required` and
 * `additionalProperties: false` on every object.
 */
export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "get_current_datetime",
    description:
      "Return the current date and time in UTC, ISO 8601. Call this before " +
      "any relative date arithmetic - never guess the current time.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "add_duration_to_datetime",
    description:
      "Shift an ISO 8601 UTC datetime by a signed amount. Use a negative " +
      "amount to go backwards.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        datetime: {
          type: "string",
          description: "ISO 8601 UTC instant, e.g. 2026-09-09T13:00:00Z",
        },
        amount: { type: "number", description: "May be negative." },
        unit: { type: "string", enum: [...DURATION_UNITS] },
      },
      required: ["datetime", "amount", "unit"],
      additionalProperties: false,
    },
  },
  {
    name: "set_reminder",
    description:
      "Create a reminder. Only call this once the exact UTC instant is known.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "What to remind the user about." },
        remind_at: {
          type: "string",
          description: "ISO 8601 UTC instant, e.g. 2026-09-16T09:00:00Z",
        },
      },
      required: ["text", "remind_at"],
      additionalProperties: false,
    },
  },
];

/**
 * Execute one tool call.
 *
 * Note the `default` branch: an unknown tool name must produce an error result,
 * not a crash. The model can and does hallucinate tool names.
 */
export function executeTool(
  name: string,
  input: unknown,
  store: ReminderStore,
  now: Date = new Date(),
): unknown {
  const args = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case "get_current_datetime":
      return { utc: getCurrentDatetime(now) };
    case "add_duration_to_datetime":
      return {
        utc: addDurationToDatetime(
          String(args.datetime),
          Number(args.amount),
          args.unit as DurationUnit,
        ),
      };
    case "set_reminder":
      return store.setReminder(String(args.text), String(args.remind_at));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
