"""The reminder-agent tools used across lessons 20-28.

The Academy builds the same project: Claude picks among a datetime tool, a
date-arithmetic tool, and a "create a reminder" tool. That project is still a
good vehicle for learning tool use, so this repository keeps it.

Two things are different from the course version:

  1. Every schema sets ``strict: True`` and ``additionalProperties: False``, so
     Claude's arguments are guaranteed to validate (lesson 23).
  2. The implementations validate their own inputs anyway. ``strict`` guarantees
     the *shape*; it does not guarantee the values make sense, and it does not
     authorise anything.

The functions are pure enough to unit test - ``get_current_datetime`` takes an
injectable clock - so lesson 22 runs with no credentials.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

DURATION_UNITS = ["minutes", "hours", "days", "weeks"]


def get_current_datetime(now: datetime | None = None) -> str:
    """Current UTC time, ISO 8601. The clock is injectable so tests are stable."""
    moment = now or datetime.now(UTC)
    return moment.astimezone(UTC).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def add_duration_to_datetime(dt: str, amount: float, unit: str) -> str:
    """Shift an ISO 8601 instant by a signed amount of a named unit."""
    try:
        base = datetime.fromisoformat(dt.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError(f"Not a valid ISO 8601 datetime: {dt}") from error
    if unit not in DURATION_UNITS:
        raise ValueError(f"Unknown unit: {unit}")
    shifted = base + timedelta(**{unit: amount})
    return get_current_datetime(shifted)


@dataclass(frozen=True)
class Reminder:
    id: str
    text: str
    remind_at: str


class ReminderStore:
    """A deliberately in-memory store.

    Lesson 27 talks about why a *mutating* tool needs idempotency and
    authorisation checks that ``strict`` does not give you.
    """

    def __init__(self) -> None:
        self._reminders: list[Reminder] = []

    def set_reminder(self, text: str, remind_at: str) -> Reminder:
        trimmed = text.strip()
        if not trimmed:
            raise ValueError("Reminder text cannot be empty")
        try:
            datetime.fromisoformat(remind_at.replace("Z", "+00:00"))
        except ValueError as error:
            raise ValueError(f"Not a valid ISO 8601 datetime: {remind_at}") from error

        # Idempotency: the same text at the same instant is one reminder, not
        # two. Without this, a retried request silently doubles up.
        for existing in self._reminders:
            if existing.text == trimmed and existing.remind_at == remind_at:
                return existing

        reminder = Reminder(f"rem_{len(self._reminders) + 1}", trimmed, remind_at)
        self._reminders.append(reminder)
        return reminder

    def list(self) -> list[Reminder]:
        return list(self._reminders)


#: Tool definitions.
#:
#: ``strict: True`` is the 2026 addition the Academy predates: it turns the
#: schema into a generation constraint rather than a hope. It requires
#: ``required`` and ``additionalProperties: False`` on every object.
TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "get_current_datetime",
        "description": (
            "Return the current date and time in UTC, ISO 8601. Call this before "
            "any relative date arithmetic - never guess the current time."
        ),
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": False,
        },
    },
    {
        "name": "add_duration_to_datetime",
        "description": (
            "Shift an ISO 8601 UTC datetime by a signed amount. Use a negative "
            "amount to go backwards."
        ),
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "datetime": {
                    "type": "string",
                    "description": "ISO 8601 UTC instant, e.g. 2026-09-09T13:00:00Z",
                },
                "amount": {"type": "number", "description": "May be negative."},
                "unit": {"type": "string", "enum": DURATION_UNITS},
            },
            "required": ["datetime", "amount", "unit"],
            "additionalProperties": False,
        },
    },
    {
        "name": "set_reminder",
        "description": (
            "Create a reminder. Only call this once the exact UTC instant is known."
        ),
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "What to remind the user about.",
                },
                "remind_at": {
                    "type": "string",
                    "description": "ISO 8601 UTC instant, e.g. 2026-09-16T09:00:00Z",
                },
            },
            "required": ["text", "remind_at"],
            "additionalProperties": False,
        },
    },
]


def execute_tool(
    name: str,
    tool_input: dict[str, Any] | None,
    store: ReminderStore,
    now: datetime | None = None,
) -> Any:
    """Execute one tool call.

    Note the ``else`` branch: an unknown tool name must produce an error result,
    not a crash. The model can and does hallucinate tool names.
    """
    args = tool_input or {}
    if name == "get_current_datetime":
        return {"utc": get_current_datetime(now)}
    if name == "add_duration_to_datetime":
        return {
            "utc": add_duration_to_datetime(
                str(args["datetime"]), float(args["amount"]), str(args["unit"])
            )
        }
    if name == "set_reminder":
        reminder = store.set_reminder(str(args["text"]), str(args["remind_at"]))
        return {
            "id": reminder.id,
            "text": reminder.text,
            "remindAt": reminder.remind_at,
        }
    raise ValueError(f"Unknown tool: {name}")
