from course.dataset import ORDER_ID_PATTERN, validate_cases

GOOD = {
    "id": "a",
    "input": "My card was charged twice for order #B-1002 and I need a refund today.",
    "expected": {"category": "billing", "urgency": "high", "has_order_id": True},
}


def test_accepts_well_formed_case_and_marks_unreviewed():
    accepted, issues = validate_cases([GOOD])
    assert issues == []
    assert accepted[0]["reviewed"] is False


def test_rejects_duplicate_ids():
    accepted, issues = validate_cases([GOOD, dict(GOOD)])
    assert len(accepted) == 1
    assert "duplicate id" in issues[0].problem


def test_rejects_labels_outside_enum():
    bad = {**GOOD, "expected": {**GOOD["expected"], "category": "refunds"}}
    _, issues = validate_cases([bad])
    assert "not in the enum" in issues[0].problem


def test_catches_contradictory_order_id_label():
    bad = {
        "id": "b",
        "input": "Please cancel my subscription at the end of the period, thanks.",
        "expected": {"category": "account", "urgency": "low", "has_order_id": True},
    }
    _, issues = validate_cases([bad])
    assert "contradicts" in issues[0].problem


def test_rejects_email_too_short():
    _, issues = validate_cases([{**GOOD, "id": "c", "input": "help"}])
    assert "too short" in issues[0].problem


def test_order_id_pattern():
    assert ORDER_ID_PATTERN.search("charged for order #A-77210 twice")
    assert ORDER_ID_PATTERN.search("order 44-9921 is blocked")
    assert ORDER_ID_PATTERN.search("any update on #Z-31?")
    assert not ORDER_ID_PATTERN.search("I placed an order last week")
