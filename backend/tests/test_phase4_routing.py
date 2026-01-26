import pandas as pd

from core.data_profile import build_data_profile
from core.dataset_classification import classify_dataset_profile
from core.analysis_routing import derive_routing


def _profile_from_columns(rows: int, columns: dict) -> dict:
    df = pd.DataFrame(columns)
    if rows > len(df):
        df = pd.concat([df] * (rows // max(len(df), 1) + 1), ignore_index=True).head(rows)
    return build_data_profile(df)


def test_customer_behavior_cross_sectional_routes_regression():
    profile = _profile_from_columns(
        120,
        {
            "customer_id": list(range(120)),
            "age": list(range(120)),
            "churn": [0, 1] * 60,
        },
    )
    classification = classify_dataset_profile(profile, analysis_intent=None)
    routing = derive_routing(classification)
    assert "regression" in routing["allowed"]
    assert "forecasting" in routing["suppressed"]


def test_accounting_time_series_allows_forecasting():
    profile = _profile_from_columns(
        90,
        {
            "invoice_id": list(range(90)),
            "revenue": list(range(90)),
            "fiscal_date": pd.date_range("2024-01-01", periods=90, freq="D"),
        },
    )
    classification = classify_dataset_profile(profile, analysis_intent=None)
    routing = derive_routing(classification)
    assert "forecasting" in routing["allowed"]
    assert "personas" in routing["suppressed"]


def test_unknown_classification_suppresses_advanced():
    profile = _profile_from_columns(
        80,
        {"field_a": list(range(80)), "field_b": list(range(80))},
    )
    classification = classify_dataset_profile(profile, analysis_intent=None)
    routing = derive_routing(classification)
    assert "regression" not in routing["allowed"]
    assert "segmentation" in routing["suppressed"]
