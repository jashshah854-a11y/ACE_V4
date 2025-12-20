import json
from pathlib import Path

from core.governance import should_block_agent, render_governed_report
from core.state_manager import StateManager


def _bootstrap_base_state(sm: StateManager):
    sm.write("dataset_identity_card", {"data_type": {"primary_type": "marketing_performance"}})
    sm.write("task_contract", {"allowed_sections": ["insights", "modeling"], "forbidden_sections": []})
    sm.write("confidence_report", {"confidence_label": "moderate"})
    sm.write("data_validation_report", {"allow_insights": True, "mode": "insight"})


def test_block_when_identity_missing(tmp_path):
    sm = StateManager(tmp_path)
    blocked, reason = should_block_agent("overseer", sm)
    assert blocked
    assert "identity" in reason.lower()


def test_block_on_validation_limitation_mode(tmp_path):
    sm = StateManager(tmp_path)
    sm.write("dataset_identity_card", {"data_type": {"primary_type": "marketing_performance"}})
    sm.write("task_contract", {"allowed_sections": ["insights"]})
    sm.write("confidence_report", {"confidence_label": "moderate"})
    sm.write("data_validation_report", {"allow_insights": False, "mode": "limitations", "blocked_agents": ["overseer"]})

    blocked, reason = should_block_agent("overseer", sm)
    assert blocked
    assert "validation" in reason.lower() or "blocked" in reason.lower()


def test_block_on_contract_forbidden_modeling(tmp_path):
    sm = StateManager(tmp_path)
    sm.write("dataset_identity_card", {"data_type": {"primary_type": "marketing_performance"}})
    sm.write(
        "task_contract",
        {"allowed_sections": ["data_overview"], "forbidden_sections": ["modeling"]},
    )
    sm.write("confidence_report", {"confidence_label": "moderate"})
    sm.write("data_validation_report", {"allow_insights": True, "mode": "insight"})

    blocked, reason = should_block_agent("regression", sm)
    assert blocked
    assert "forbid" in reason.lower()


def test_block_on_low_confidence(tmp_path):
    sm = StateManager(tmp_path)
    sm.write("dataset_identity_card", {"data_type": {"primary_type": "marketing_performance"}})
    sm.write("task_contract", {"allowed_sections": ["insights", "modeling"]})
    sm.write("confidence_report", {"confidence_label": "low"})
    sm.write("data_validation_report", {"allow_insights": True, "mode": "insight"})

    blocked, reason = should_block_agent("overseer", sm)
    assert blocked
    assert "confidence" in reason.lower()


def test_render_governed_report_drops_insights_when_not_allowed(tmp_path):
    run_path = tmp_path
    sm = StateManager(run_path)
    sm.write("dataset_identity_card", {"data_type": {"primary_type": "marketing_performance"}})
    sm.write("task_contract", {"allowed_sections": ["data_overview"], "forbidden_sections": ["insights"]})
    sm.write("confidence_report", {"confidence_label": "moderate"})
    sm.write("data_validation_report", {"allow_insights": True, "mode": "insight"})
    sm.write("limitations", [])

    insights_path = Path(run_path) / "artifacts" / "insights.json"
    insights_path.parent.mkdir(parents=True, exist_ok=True)
    sample_insights = [
        {
            "claim": "CTR improved",
            "columns_used": ["ctr"],
            "metric_name": "ctr",
            "metric_value": 0.12,
            "method": "aggregation",
            "evidence_ref": "artifacts/ctr.csv",
        }
    ]
    with open(insights_path, "w", encoding="utf-8") as f:
        json.dump(sample_insights, f)

    report = render_governed_report(sm, insights_path)
    assert report["insights"] == []
    assert any("insights section not allowed" in (lim.get("message", "").lower()) for lim in report["limitations"])

