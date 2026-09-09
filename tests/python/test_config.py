from course.config import supports_effort


def test_effort_is_rejected_on_haiku_45_and_sonnet_45():
    # Verified live: claude-haiku-4-5 returns
    # 400 "This model does not support the effort parameter."
    assert supports_effort("claude-haiku-4-5") is False
    assert supports_effort("claude-haiku-4-5-20251001") is False
    assert supports_effort("claude-sonnet-4-5-20250929") is False


def test_effort_is_accepted_on_current_sonnet_opus_and_fable():
    for model in (
        "claude-sonnet-4-6",
        "claude-sonnet-5",
        "claude-opus-4-6",
        "claude-opus-5",
        "claude-fable-5-1",
    ):
        assert supports_effort(model) is True, model
