import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from ace_v4.explainability.engine import ExplainabilityEngine
from ace_v4.anomaly_engine.models import AnomalyRecord


def make_outlier_anomaly():
    return AnomalyRecord(
        id="a1",
        table_name="transactions",
        column_name="spend",
        row_index=10,
        anomaly_type="outlier",
        severity="high",
        description="test",
        suggested_fix="",
        context={
            "value": 53500,
            "lower_bound": 500,
            "upper_bound": 32000,
        },
        detector="outlier_iqr",
        rule_name="outlier_iqr_global",
    )


def test_outlier_explanation():
    anomaly = make_outlier_anomaly()
    engine = ExplainabilityEngine()

    explained = engine.explain_one(anomaly)

    assert "outside the expected range" in explained.explanation
    assert "IQR outlier rule" in explained.explanation
    assert "Check this record" in explained.suggested_fix
    print("✅ test_outlier_explanation passed")

if __name__ == "__main__":
    test_outlier_explanation()
