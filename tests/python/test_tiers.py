from dataclasses import replace

from course.tiers import TaskShape, recommend_tier

AGENT_SHAPED = TaskShape(
    steps_are_knowable=False,
    needs_multiple_steps=True,
    outcome_justifies_cost=True,
    measured_viable=True,
    errors_are_recoverable=True,
    needs_hosted_runtime=False,
)


def test_single_step_task_is_a_single_call():
    assert recommend_tier(replace(AGENT_SHAPED, needs_multiple_steps=False)).tier == (
        "single-call"
    )


def test_knowable_sequence_is_a_workflow():
    result = recommend_tier(replace(AGENT_SHAPED, steps_are_knowable=True))
    assert result.tier == "workflow"
    assert result.failed == []


def test_all_checks_passing_gives_an_agent():
    result = recommend_tier(AGENT_SHAPED)
    assert result.tier == "agent"
    assert result.failed == []


def test_hosted_runtime_escalates():
    assert recommend_tier(replace(AGENT_SHAPED, needs_hosted_runtime=True)).tier == (
        "hosted-agent"
    )


def test_each_failing_check_drops_back_to_a_workflow():
    for field, label in (
        ("outcome_justifies_cost", "value"),
        ("measured_viable", "viability"),
        ("errors_are_recoverable", "cost of error"),
    ):
        result = recommend_tier(replace(AGENT_SHAPED, **{field: False}))
        assert result.tier == "workflow", field
        assert result.failed == [label]


def test_several_failing_checks_are_all_reported():
    result = recommend_tier(
        replace(AGENT_SHAPED, measured_viable=False, errors_are_recoverable=False)
    )
    assert result.tier == "workflow"
    assert result.failed == ["viability", "cost of error"]


def test_unrecoverable_task_never_becomes_a_hosted_agent():
    result = recommend_tier(
        replace(AGENT_SHAPED, needs_hosted_runtime=True, errors_are_recoverable=False)
    )
    assert result.tier == "workflow"
