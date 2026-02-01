import pandas as pd
import pytest

from backend.core.enhanced_analytics import run_enhanced_analytics


def test_redundancy_report_detects_constants_and_pairs():
    rows = 100
    df = pd.DataFrame(
        {
            "constant_col": [1] * rows,
            "near_constant_col": [0] * (rows - 1) + [1],
            "feature_b": list(range(rows)),
            "feature_c": [value * 2 for value in range(rows)],
        }
    )

    with pytest.warns(UserWarning, match="scipy.stats.shapiro"):
        with pytest.warns(RuntimeWarning, match="Precision loss occurred"):
            results = run_enhanced_analytics(df)

    redundancy = results.get("redundancy_report")

    assert redundancy is not None
    assert redundancy.get("valid") is True
    assert redundancy.get("status") == "success"

    constants = redundancy.get("constants") or []
    near_constants = redundancy.get("near_constants") or []
    pairs = redundancy.get("redundant_pairs") or []

    assert "constant_col" in constants
    assert "near_constant_col" in near_constants
    assert any(
        {
            pair.get("feature1"),
            pair.get("feature2"),
        }
        == {"feature_b", "feature_c"}
        for pair in pairs
    )
