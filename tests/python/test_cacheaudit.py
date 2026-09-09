from course.cacheaudit import audit_prefix, likely_below_minimum


def test_stable_prefix_produces_no_findings():
    assert (
        audit_prefix(
            system="You are a handbook assistant. Answer from the handbook.",
            tools=[{"name": "a_tool"}, {"name": "b_tool"}],
            stable_messages=["What is the on-call handover time?"],
        )
        == []
    )


def test_timestamp_in_system_is_caught():
    findings = audit_prefix(system="Current time: 2026-09-09T13:36:00Z\nHello.")
    assert len(findings) == 1
    assert findings[0].where == "system"
    assert "timestamp" in findings[0].problem


def test_uuid_and_request_id_are_caught():
    findings = audit_prefix(
        system="trace 3f2504e0-4f89-11d3-9a0c-0305e82c3301 request_id abc"
    )
    assert len(findings) == 2


def test_invalidator_in_early_message_is_caught():
    findings = audit_prefix(
        stable_messages=["ok", "generated at 2026-09-09T00:00:00Z"]
    )
    assert findings[0].where == "messages[1]"


def test_non_deterministic_tool_order_is_flagged():
    findings = audit_prefix(tools=[{"name": "z_tool"}, {"name": "a_tool"}])
    assert len(findings) == 1
    assert "not deterministic" in findings[0].problem


def test_likely_below_minimum():
    assert likely_below_minimum("short") is True
    assert likely_below_minimum("x" * 8000) is False
    assert likely_below_minimum("x" * 8000, 4096) is True
