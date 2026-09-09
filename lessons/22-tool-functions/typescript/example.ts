/**
 * Lesson 22 - Tool functions.
 *
 * Runs entirely locally. No API key, no network, no cost. The point is that
 * these are ordinary functions - and that the failure paths matter as much as
 * the happy path, because Claude will hit all of them.
 *
 *   npm run lesson -- 22
 */
import {
  ReminderStore,
  addDurationToDatetime,
  executeTool,
  getCurrentDatetime,
  type DurationUnit,
} from "../../../shared/typescript/tools.ts";

const FIXED = new Date("2026-09-09T13:36:00.000Z");

function show(label: string, thunk: () => unknown): void {
  try {
    console.log(`  ok    ${label.padEnd(44)} -> ${JSON.stringify(thunk())}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  throw ${label.padEnd(44)} -> ${message}`);
  }
}

console.log("getCurrentDatetime - injectable clock, so it is testable");
show("getCurrentDatetime(FIXED)", () => getCurrentDatetime(FIXED));
console.log();

console.log("addDurationToDatetime - happy paths");
show('add(.., 1, "weeks")', () =>
  addDurationToDatetime("2026-09-09T13:36:00Z", 1, "weeks"),
);
show('add(.., -3, "days")', () =>
  addDurationToDatetime("2026-09-09T13:36:00Z", -3, "days"),
);
show('add("2026-01-31T00:00:00Z", 1, "days")  month boundary', () =>
  addDurationToDatetime("2026-01-31T00:00:00Z", 1, "days"),
);
console.log();

console.log("addDurationToDatetime - the failures Claude will actually cause");
show('add("next Tuesday", 1, "days")', () =>
  addDurationToDatetime("next Tuesday", 1, "days"),
);
show('add(.., 1, "fortnights")  unit outside the enum', () =>
  addDurationToDatetime("2026-09-09T13:36:00Z", 1, "fortnights" as DurationUnit),
);
console.log();

const store = new ReminderStore();
console.log("setReminder - validation and idempotency");
show("setReminder('Renew SSO cert', '2026-09-16T09:00:00Z')", () =>
  store.setReminder("Renew SSO cert", "2026-09-16T09:00:00Z"),
);
show("same call again  (a retried request)", () =>
  store.setReminder("Renew SSO cert", "2026-09-16T09:00:00Z"),
);
console.log(`  reminders in the store: ${store.list().length}`);
show("setReminder('   ', ..)", () => store.setReminder("   ", "2026-09-16T09:00:00Z"));
show("setReminder('x', 'soon')", () => store.setReminder("x", "soon"));
console.log();

console.log("executeTool - the dispatcher must survive a hallucinated tool name");
show('executeTool("delete_everything", ..)', () =>
  executeTool("delete_everything", {}, store),
);

console.log(
  "\nThe SDK retries 429s and 5xxs for you. Without the idempotency check\n" +
    "above, a retried request would have created two reminders. `strict: true`\n" +
    "does not protect you from that - it constrains the shape, not the meaning.",
);
