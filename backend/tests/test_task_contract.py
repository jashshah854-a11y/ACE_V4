import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from core.task_contract import build_task_contract


def test_task_contract_regression_allows_modeling():
    card = {"data_type": {"primary_type": "marketing_performance"}}
    validation = {"mode": "insight"}
    contract = build_task_contract(card, validation, drift_status="none", has_target=True, target_is_binary=False)
    assert "modeling" in contract["allowed_sections"]
    assert contract["template"] == "marketing"


def test_task_contract_drift_block_limits_sections():
    card = {"data_type": {"primary_type": "unknown"}}
    validation = {"mode": "insight"}
    contract = build_task_contract(card, validation, drift_status="block", has_target=False, target_is_binary=False)
    assert "modeling" in contract["forbidden_sections"]
    assert "quality" in contract["allowed_sections"]



def test_task_contract_blocks_financial_claims_without_financial_columns():
    card = {"columns": {"customer_id": {"dtype": "int64"}}, "data_type": {"primary_type": "general"}}
    validation = {"mode": "insight"}
    contract = build_task_contract(card, validation, drift_status="none", has_target=False, target_is_binary=False)
    assert contract["forbidden_claims"].get("allow_financial_insights") is False


def test_task_contract_honors_user_forbidden_claims():
    card = {"columns": {"revenue": {"dtype": "float64"}}, "data_type": {"primary_type": "general"}}
    validation = {"mode": "insight"}
    user_intent = {
        "primary_question": "How do we grow revenue?",
        "decision_context": "Executive review",
        "required_output_type": "diagnostic",
        "success_criteria": "Identify the blockers",
        "constraints": "",
        "confidence_threshold": 80.0,
        "out_of_scope_dimensions": [],
        "forbidden_claims": ["no_revenue_inference", "strict_mode"],
        "strict_mode": True,
    }
    contract = build_task_contract(card, validation, drift_status="none", has_target=True, target_is_binary=False, user_intent=user_intent)
    assert contract["forbidden_claims"].get("allow_financial_insights") is False
    assert contract["confidence_threshold"] >= 90.0

