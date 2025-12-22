import json
from pathlib import Path
from types import SimpleNamespace

from core.governance import render_governed_report
from core.state_manager import StateManager
from agents.expositor import Expositor


def test_governed_report_blocks_zero_confidence(tmp_path):
    sm = StateManager(tmp_path)
    sm.write("dataset_identity_card", {"data_type": {"primary_type": "marketing_performance"}})
    sm.write("task_contract", {"allowed_sections": ["insights"], "forbidden_sections": []})
    sm.write("confidence_report", {"data_confidence": 0.0, "confidence_label": "low", "reasons": ["mock"]})
    sm.write("data_validation_report", {"allow_insights": True, "mode": "insight"})
    sm.write("limitations", [])

    insights_path = Path(tmp_path) / "artifacts" / "insights.json"
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
    assert report["mode"] == "limitations"
    assert report["insights"] == []
    assert any("suppressed" in lim.get("message", "").lower() for lim in report["limitations"])


def test_business_intel_section_surfaces_evidence_and_risk(tmp_path):
    sm = StateManager(tmp_path)
    schema_stub = SimpleNamespace(domain_guess=None)
    ex = Expositor(schema_map=schema_stub, state=sm)

    bi = {
        "value_metrics": {
            "total_value": 100.0,
            "avg_value": 10.0,
            "median_value": 9.0,
            "top_10_percent_value": 20.0,
            "value_concentration": 0.4,
        },
        "segment_value": [
            {"segment": "Cluster 0", "total_value": 60.0, "avg_value": 12.0, "size": 5, "value_contribution_pct": 60.0}
        ],
        "churn_risk": {
            "at_risk_count": 2,
            "at_risk_percentage": 20.0,
            "avg_activity": 1.2,
            "low_activity_threshold": 0.5,
            "activity_column": "visits",
        },
        "evidence": {
            "value_column": "amount",
            "segment_value_column": "amount",
            "churn_activity_column": "visits",
        },
    }

    lines = ex._business_intelligence_section(bi)
    rendered = "\n".join(lines)
    assert "amount" in rendered
    assert "Risk definition" in rendered

