import sys
from pathlib import Path

import numpy as np
import pandas as pd

# Ensure backend modules are importable
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from intake.profiling import (
    compute_drift_report,
    compute_sample_drift,
    profile_dataframe,
)


def test_profile_dataframe_basic():
    df = pd.DataFrame(
        {
            "num": [1, 2, 3, 4],
            "txt": ["a", "bb", "ccc", None],
        }
    )
    prof = profile_dataframe(df)
    assert prof["row_count"] == 4
    assert prof["column_count"] == 2
    assert "num" in prof["columns"]
    assert "txt" in prof["columns"]
    assert prof["columns"]["num"]["null_pct"] == 0.0
    assert prof["columns"]["txt"]["null_pct"] > 0.0


def test_compute_drift_report_profile_warn():
    baseline = {
        "columns": {
            "a": {"null_pct": 0.0, "distinct_pct": 0.1},
        }
    }
    current = {
        "columns": {
            "a": {"null_pct": 0.2, "distinct_pct": 0.5},
        }
    }
    drift = compute_drift_report(baseline, current, psi_warn=0.1, psi_block=0.5, cat_warn=0.1)
    assert drift["status"] in {"warn", "block"}
    assert "a" in drift["columns"]


def test_compute_sample_drift_block_numeric():
    base = pd.DataFrame({"x": np.random.normal(0, 1, size=500)})
    curr = pd.DataFrame({"x": np.random.normal(10, 1, size=500)})
    drift = compute_sample_drift(base, curr, psi_warn=0.1, psi_block=0.25, cat_warn=0.1)
    assert drift["status"] in {"warn", "block"}
    assert "x" in drift["columns"]

