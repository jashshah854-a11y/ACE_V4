import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.analysis_intent import classify_analysis_intent


def test_spotify_style_dataset_is_exploratory():
    schema = {
        "row_count": 1000,
        "columns": {
            "track_id": {"dtype": "int64", "distinct_pct": 1.0},
            "artist_name": {"dtype": "object", "distinct_pct": 0.95},
            "duration_ms": {"dtype": "int64", "distinct_pct": 0.8, "std": 120000.0},
            "danceability": {"dtype": "float64", "distinct_pct": 0.9, "std": 0.2},
        },
    }

    result = classify_analysis_intent(schema)
    assert result["intent"] == "exploratory"
    assert result["target_candidate"]["detected"] is False


def test_binary_outcome_column_is_predictive():
    schema = {
        "row_count": 200,
        "columns": {
            "customer_id": {"dtype": "int64", "distinct_pct": 1.0},
            "churn": {"dtype": "object", "distinct_pct": 0.01},
            "tenure_months": {"dtype": "int64", "distinct_pct": 0.5, "std": 12.0},
        },
    }

    result = classify_analysis_intent(schema)
    assert result["intent"] == "predictive"
    assert result["target_candidate"]["detected"] is True
    assert result["target_candidate"]["column"] == "churn"


def test_user_target_override_is_predictive():
    schema = {
        "row_count": 120,
        "columns": {
            "account_id": {"dtype": "int64", "distinct_pct": 1.0},
            "feature_a": {"dtype": "float64", "distinct_pct": 0.8, "std": 1.2},
        },
    }

    result = classify_analysis_intent(schema, user_target="custom_target")
    assert result["intent"] == "predictive"
    assert result["target_candidate"]["detected"] is True
    assert result["target_candidate"]["column"] == "custom_target"


def test_id_like_numeric_column_not_selected():
    schema = {
        "row_count": 300,
        "columns": {
            "customer_id": {"dtype": "int64", "distinct_pct": 1.0},
            "churn": {"dtype": "object", "distinct_pct": 0.01},
            "age": {"dtype": "int64", "distinct_pct": 0.2, "std": 10.0},
        },
    }

    result = classify_analysis_intent(schema)
    assert result["target_candidate"]["column"] != "customer_id"
