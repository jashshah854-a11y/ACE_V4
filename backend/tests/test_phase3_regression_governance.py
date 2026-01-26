import numpy as np
import pandas as pd

from anti_gravity.core.regression import compute_regression_insights


def test_feature_governance_excludes_id_columns():
    df = pd.DataFrame(
        {
            "customer_id": np.arange(100),
            "x": np.random.normal(size=100),
            "target": np.random.normal(size=100),
        }
    )
    insights = compute_regression_insights(df, schema_map=None)
    assert insights["status"] == "ok"
    excluded = insights["feature_governance_report"]["excluded_features"]
    excluded_names = {entry["feature"] for entry in excluded}
    assert "customer_id" in excluded_names
    drivers = insights.get("importance_report", {}).get("features", [])
    assert all(driver["feature"] != "customer_id" for driver in drivers)


def test_coefficients_suppressed_when_vif_critical():
    base = np.random.normal(size=200)
    df = pd.DataFrame(
        {
            "x1": base,
            "x2": base * 2.0,
            "target": base * 0.8 + np.random.normal(scale=1.0, size=200),
        }
    )
    insights = compute_regression_insights(df, schema_map=None, model_type="linear")
    assert insights["status"] == "ok"
    collinearity = insights.get("collinearity_report", {})
    assert collinearity.get("max_vif") is None or collinearity.get("max_vif") >= 10
    assert insights.get("regression_coefficients_report") is None


def test_leakage_report_flags_target_pairs():
    base = np.random.normal(size=120)
    df = pd.DataFrame(
        {
            "driver": base,
            "target": base * 1.5 + 2.0,
        }
    )
    insights = compute_regression_insights(df, schema_map=None)
    assert insights["status"] == "ok"
    leakage = insights.get("leakage_report", {})
    assert leakage.get("flagged_target_pairs"), "Expected target leakage to be flagged"
