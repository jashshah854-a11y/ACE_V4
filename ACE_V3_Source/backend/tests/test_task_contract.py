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

