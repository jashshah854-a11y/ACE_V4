import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from core.insights import validate_insights


def test_insight_provenance_missing():
    insights = [
        {"columns_used": ["a"], "metric_name": "r2", "metric_value": 0.9, "method": "regression", "evidence_ref": "eval/r2"},
        {"columns_used": ["b"], "metric_name": "auc", "metric_value": 0.8, "method": "classification"},  # missing evidence_ref
    ]
    result = validate_insights(insights)
    assert result["ok"] is False
    assert result["missing"]


def test_insight_provenance_ok():
    insights = [
        {"columns_used": ["a"], "metric_name": "r2", "metric_value": 0.9, "method": "regression", "evidence_ref": "eval/r2"},
    ]
    result = validate_insights(insights)
    assert result["ok"] is True

