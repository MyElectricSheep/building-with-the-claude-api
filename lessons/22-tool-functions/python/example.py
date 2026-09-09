"""Lesson 22 - Tool functions.

Runs entirely locally. No API key, no network, no cost. The point is that these
are ordinary functions - and that the failure paths matter as much as the happy
path, because Claude will hit all of them.

    uv run lesson 22
"""

from __future__ import annotations

from datetime import UTC, datetime

from course.tools import (
    ReminderStore,
    add_duration_to_datetime,
    execute_tool,
    get_current_datetime,
)

FIXED = datetime(2026, 9, 9, 13, 36, 0, tzinfo=UTC)


def show(label: str, thunk) -> None:  # noqa: ANN001
    try:
        print(f"  ok    {label:<44} -> {thunk()}")
    except Exception as error:  # noqa: BLE001
        print(f"  raise {label:<44} -> {type(error).__name__}: {error}")


def main() -> None:
    print("get_current_datetime - injectable clock, so it is testable")
    show("get_current_datetime(FIXED)", lambda: get_current_datetime(FIXED))
    print()

    print("add_duration_to_datetime - happy paths")
    show(
        'add(.., 1, "weeks")',
        lambda: add_duration_to_datetime("2026-09-09T13:36:00Z", 1, "weeks"),
    )
    show(
        'add(.., -3, "days")',
        lambda: add_duration_to_datetime("2026-09-09T13:36:00Z", -3, "days"),
    )
    show(
        'add("2026-01-31T00:00:00Z", 1, "days")  month boundary',
        lambda: add_duration_to_datetime("2026-01-31T00:00:00Z", 1, "days"),
    )
    print()

    print("add_duration_to_datetime - the failures Claude will actually cause")
    show(
        'add("next Tuesday", 1, "days")',
        lambda: add_duration_to_datetime("next Tuesday", 1, "days"),
    )
    show(
        'add(.., 1, "fortnights")  unit outside the enum',
        lambda: add_duration_to_datetime("2026-09-09T13:36:00Z", 1, "fortnights"),
    )
    print()

    store = ReminderStore()
    print("set_reminder - validation and idempotency")
    show(
        "set_reminder('Renew SSO cert', '2026-09-16T09:00:00Z')",
        lambda: store.set_reminder("Renew SSO cert", "2026-09-16T09:00:00Z"),
    )
    show(
        "same call again  (a retried request)",
        lambda: store.set_reminder("Renew SSO cert", "2026-09-16T09:00:00Z"),
    )
    print(f"  reminders in the store: {len(store.list())}")
    show(
        "set_reminder('   ', ..)",
        lambda: store.set_reminder("   ", "2026-09-16T09:00:00Z"),
    )
    show("set_reminder('x', 'soon')", lambda: store.set_reminder("x", "soon"))
    print()

    print("execute_tool - the dispatcher must survive a hallucinated tool name")
    show(
        'execute_tool("delete_everything", ..)',
        lambda: execute_tool("delete_everything", {}, store),
    )

    print(
        "\nThe SDK retries 429s and 5xxs for you. Without the idempotency check\n"
        "above, a retried request would have created two reminders. `strict: true`\n"
        "does not protect you from that - it constrains the shape, not the meaning."
    )


if __name__ == "__main__":
    main()
