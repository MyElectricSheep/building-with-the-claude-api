from datetime import UTC, datetime

import pytest
from course.tools import (
    ReminderStore,
    add_duration_to_datetime,
    execute_tool,
    get_current_datetime,
)

FIXED = datetime(2026, 9, 9, 13, 36, 0, tzinfo=UTC)


def test_get_current_datetime_formats_to_whole_seconds():
    assert get_current_datetime(FIXED) == "2026-09-09T13:36:00Z"


def test_add_duration_shifts_forwards_and_backwards():
    assert add_duration_to_datetime("2026-09-09T13:36:00Z", 2, "hours") == (
        "2026-09-09T15:36:00Z"
    )
    assert add_duration_to_datetime("2026-09-09T13:36:00Z", -1, "weeks") == (
        "2026-09-02T13:36:00Z"
    )
    assert add_duration_to_datetime("2026-09-09T13:36:00Z", 90, "minutes") == (
        "2026-09-09T15:06:00Z"
    )


def test_add_duration_crosses_month_boundary():
    assert add_duration_to_datetime("2026-01-31T00:00:00Z", 1, "days") == (
        "2026-02-01T00:00:00Z"
    )


def test_add_duration_rejects_bad_input():
    with pytest.raises(ValueError, match="ISO 8601"):
        add_duration_to_datetime("not a date", 1, "days")
    with pytest.raises(ValueError, match="Unknown unit"):
        add_duration_to_datetime("2026-09-09T13:36:00Z", 1, "fortnights")


def test_reminder_store_is_idempotent():
    store = ReminderStore()
    first = store.set_reminder("Renew the SSO cert", "2026-09-19T09:00:00Z")
    second = store.set_reminder("Renew the SSO cert", "2026-09-19T09:00:00Z")
    assert first.id == second.id
    assert len(store.list()) == 1


def test_reminder_store_rejects_bad_input():
    store = ReminderStore()
    with pytest.raises(ValueError, match="empty"):
        store.set_reminder("   ", "2026-09-19T09:00:00Z")
    with pytest.raises(ValueError, match="ISO 8601"):
        store.set_reminder("x", "soon")


def test_execute_tool_dispatches_by_name():
    store = ReminderStore()
    assert execute_tool("get_current_datetime", {}, store, FIXED) == {
        "utc": "2026-09-09T13:36:00Z"
    }
    assert execute_tool(
        "add_duration_to_datetime",
        {"datetime": "2026-09-09T13:36:00Z", "amount": 1, "unit": "days"},
        store,
    ) == {"utc": "2026-09-10T13:36:00Z"}


def test_execute_tool_raises_on_unknown_name():
    with pytest.raises(ValueError, match="Unknown tool"):
        execute_tool("delete_everything", {}, ReminderStore())
