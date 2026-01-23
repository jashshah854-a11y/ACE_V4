import warnings

import pandas as pd


def coerce_datetime(series: pd.Series) -> pd.Series:
    version_parts = pd.__version__.split(".")
    try:
        major = int(version_parts[0])
    except ValueError:
        major = 0
    if major >= 2:
        return pd.to_datetime(series, errors="coerce", utc=False, format="mixed")
    with warnings.catch_warnings():
        warnings.filterwarnings(
            "ignore",
            message="Could not infer format",
            category=UserWarning,
        )
        return pd.to_datetime(series, errors="coerce", utc=False)
