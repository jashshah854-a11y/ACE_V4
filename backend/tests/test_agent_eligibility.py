from core.agent_eligibility import resolve_agent_eligibility
from core.confidence import compute_data_confidence


def test_exploratory_intent_marks_regression_not_applicable():
    decision = resolve_agent_eligibility(
        "regression",
        {"intent": "exploratory", "target_candidate": {"detected": False}},
    )
    assert decision["status"] == "not_applicable"
    assert decision["reason_code"] == "intent_exploratory"


def test_predictive_without_target_marks_not_applicable():
    decision = resolve_agent_eligibility(
        "regression",
        {"intent": "predictive", "target_candidate": {"detected": False}},
    )
    assert decision["status"] == "not_applicable"
    assert decision["reason_code"] == "target_missing"


def test_predictive_with_target_is_eligible():
    decision = resolve_agent_eligibility(
        "regression",
        {"intent": "predictive", "target_candidate": {"detected": True}},
    )
    assert decision["status"] == "eligible"


def test_exploratory_keeps_descriptive_agents_eligible():
    decision = resolve_agent_eligibility(
        "personas",
        {"intent": "exploratory", "target_candidate": {"detected": False}},
    )
    assert decision["status"] == "eligible"


def test_missing_target_does_not_reduce_confidence():
    identity = {"quality": {"max_null_pct": 0.0, "avg_null_pct": 0.0}}
    validation = {
        "checks": {
            "sample_size": {"ok": True},
            "variance": {"ok": True, "applicable": False},
        },
        "mode": "insight",
    }
    report = compute_data_confidence(identity, validation, drift_status="none")
    assert report["data_confidence"] == 1.0
