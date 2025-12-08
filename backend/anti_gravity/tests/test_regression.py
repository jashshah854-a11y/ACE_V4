import numpy as np
import pandas as pd

from anti_gravity.core.regression import (
    RegressionConfig,
    compute_regression_insights,
    select_regression_target,
)
from core.schema import SchemaMap


def test_select_regression_target_prefers_semantic_role():
    df = pd.DataFrame(
        {
            "revenue": np.linspace(100, 500, num=200),
            "usage": np.random.default_rng(0).normal(size=200),
        }
    )
    schema = SchemaMap()
    schema.semantic_roles.value_like = ["revenue"]

    target = select_regression_target(df, schema, RegressionConfig(min_samples=20))
    assert target == "revenue"


def test_compute_regression_insights_reports_metrics():
    rng = np.random.default_rng(123)
    rows = 250
    df = pd.DataFrame(
        {
            "spend": rng.normal(500, 50, size=rows),
            "tenure": rng.integers(1, 60, size=rows),
            "balance": rng.normal(2000, 300, size=rows),
        }
    )
    df["growth"] = 3.2 * df["spend"] + 1.5 * df["tenure"] + rng.normal(0, 25, size=rows)

    schema = SchemaMap()
    schema.semantic_roles.value_like = ["growth"]
    schema.feature_plan.value_features = ["spend", "tenure", "balance"]

    result = compute_regression_insights(df, schema, RegressionConfig(min_samples=60))

    assert result["status"] == "ok"
    assert result["target_column"] == "growth"
    assert set(result["metrics"]).issuperset({"r2", "mae", "rmse"})
    assert result["metrics"]["r2"] > 0.7
    assert result["drivers"]
    assert result["predictions"]
