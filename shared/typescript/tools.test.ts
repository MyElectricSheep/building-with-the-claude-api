import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ReminderStore,
  addDurationToDatetime,
  executeTool,
  getCurrentDatetime,
} from "./tools.ts";

const FIXED = new Date("2026-09-09T13:36:00.000Z");

test("getCurrentDatetime formats to whole seconds", () => {
  assert.equal(getCurrentDatetime(FIXED), "2026-09-09T13:36:00Z");
});

test("addDurationToDatetime shifts forwards and backwards", () => {
  assert.equal(
    addDurationToDatetime("2026-09-09T13:36:00Z", 2, "hours"),
    "2026-09-09T15:36:00Z",
  );
  assert.equal(
    addDurationToDatetime("2026-09-09T13:36:00Z", -1, "weeks"),
    "2026-09-02T13:36:00Z",
  );
  assert.equal(
    addDurationToDatetime("2026-09-09T13:36:00Z", 90, "minutes"),
    "2026-09-09T15:06:00Z",
  );
});

test("addDurationToDatetime crosses a month boundary correctly", () => {
  assert.equal(
    addDurationToDatetime("2026-01-31T00:00:00Z", 1, "days"),
    "2026-02-01T00:00:00Z",
  );
});

test("addDurationToDatetime rejects bad input", () => {
  assert.throws(() => addDurationToDatetime("not a date", 1, "days"), /ISO 8601/);
  assert.throws(
    () => addDurationToDatetime("2026-09-09T13:36:00Z", Number.NaN, "days"),
    /finite/,
  );
  assert.throws(
    // @ts-expect-error - deliberately passing a unit outside the enum
    () => addDurationToDatetime("2026-09-09T13:36:00Z", 1, "fortnights"),
    /Unknown unit/,
  );
});

test("ReminderStore is idempotent for an identical reminder", () => {
  const store = new ReminderStore();
  const first = store.setReminder("Renew the SSO cert", "2026-09-19T09:00:00Z");
  const second = store.setReminder("Renew the SSO cert", "2026-09-19T09:00:00Z");
  assert.equal(first.id, second.id);
  assert.equal(store.list().length, 1);
});

test("ReminderStore rejects empty text and bad datetimes", () => {
  const store = new ReminderStore();
  assert.throws(() => store.setReminder("   ", "2026-09-19T09:00:00Z"), /empty/);
  assert.throws(() => store.setReminder("x", "soon"), /ISO 8601/);
});

test("executeTool dispatches by name", () => {
  const store = new ReminderStore();
  assert.deepEqual(executeTool("get_current_datetime", {}, store, FIXED), {
    utc: "2026-09-09T13:36:00Z",
  });
  assert.deepEqual(
    executeTool(
      "add_duration_to_datetime",
      { datetime: "2026-09-09T13:36:00Z", amount: 1, unit: "days" },
      store,
    ),
    { utc: "2026-09-10T13:36:00Z" },
  );
});

test("executeTool raises on an unknown tool name rather than crashing silently", () => {
  const store = new ReminderStore();
  assert.throws(() => executeTool("delete_everything", {}, store), /Unknown tool/);
});
