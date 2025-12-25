import pandas as pd
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from ace_v4.context.engine import ContextEngine
from ace_v4.anomaly_engine.models import AnomalyRecord

def make_anomaly(row_idx, col="transaction_amount"):
    return AnomalyRecord(
        id=f"a{row_idx}",
        table_name="transactions",
        column_name=col,
        row_index=row_idx,
        anomaly_type="outlier",
        severity="high",
        description="test",
        suggested_fix=None,
        context={}
    )

def test_refund_case():
    df = pd.DataFrame({
        "transaction_amount": [-50],
        "transaction_type": ["refund"]
    })

    anomaly = make_anomaly(0)

    engine = ContextEngine()
    out = engine.apply_rules(df, [anomaly])

    assert out[0].severity == "medium"

def test_vip_case():
    df = pd.DataFrame({
        "spend": [60000],
        "segment": ["VIP"]
    })

    anomaly = make_anomaly(0, col="spend")

    engine = ContextEngine()
    out = engine.apply_rules(df, [anomaly])

    assert out[0].context.get("valid_extreme") == True

def test_suppress_synthetic():
    df = pd.DataFrame({
        "account_id": ["TEST123"]
    })

    anomaly = make_anomaly(0, col="account_id")

    engine = ContextEngine()
    out = engine.apply_rules(df, [anomaly])

    # suppressed anomalies should be removed
    assert len(out) == 0

if __name__ == "__main__":
    test_refund_case()
    test_vip_case()
    test_suppress_synthetic()
    print("All tests passed!")
