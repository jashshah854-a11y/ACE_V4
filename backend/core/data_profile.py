from __future__ import annotations

from typing import Any, Dict, List, Tuple
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import pandas as pd


def _near_constant(series: pd.Series, threshold: float = 0.98) -> bool:
    values = series.dropna()
    if values.empty:
        return True
    top_ratio = values.value_counts(normalize=True).iloc[0]
    return float(top_ratio) >= threshold


def _infer_datetime(series: pd.Series) -> bool:
    if pd.api.types.is_datetime64_any_dtype(series):
        return True
    if not pd.api.types.is_object_dtype(series):
        return False
    sample = series.dropna().astype(str).head(100)
    if sample.empty:
        return False
    parsed = pd.to_datetime(sample, errors="coerce", utc=True)
    return parsed.notna().mean() >= 0.8


def _basic_stats(series: pd.Series) -> Dict[str, Any]:
    numeric = pd.to_numeric(series, errors="coerce")
    numeric = numeric.dropna()
    if numeric.empty:
        return {}
    return {
        "mean": float(numeric.mean()),
        "median": float(numeric.median()),
        "std": float(numeric.std(ddof=0)),
        "min": float(numeric.min()),
        "max": float(numeric.max()),
        "skew": float(numeric.skew()) if len(numeric) > 2 else 0.0,
        "q25": float(numeric.quantile(0.25)),
        "q75": float(numeric.quantile(0.75)),
    }


def _profile_single_column(args: tuple) -> tuple:
    """Profile one column; returns (col, col_data, inferred, is_constant, is_near_constant)."""
    col, series, row_count = args
    dtype = str(series.dtype)
    missing_count = int(series.isna().sum())
    missing_pct = float(missing_count / row_count) if row_count else 0.0
    distinct_count = int(series.nunique(dropna=True))
    distinct_pct = float(distinct_count / row_count) if row_count else 0.0
    constant = distinct_count <= 1
    near_constant = _near_constant(series)

    if pd.api.types.is_bool_dtype(series):
        inferred = "boolean"
    elif pd.api.types.is_numeric_dtype(series):
        inferred = "numeric"
    elif _infer_datetime(series):
        inferred = "datetime"
    elif pd.api.types.is_object_dtype(series) and distinct_pct > 0.5:
        inferred = "text"
    else:
        inferred = "categorical"

    col_data: Dict[str, Any] = {
        "dtype": dtype,
        "inferred_type": inferred,
        "missing_count": missing_count,
        "missing_pct": round(missing_pct, 4),
        "distinct_count": distinct_count,
        "distinct_pct": round(distinct_pct, 4),
        "constant": bool(constant),
        "near_constant": bool(near_constant),
    }

    if inferred == "numeric":
        stats = _basic_stats(series)
        if stats:
            col_data["stats"] = stats
    elif inferred == "datetime":
        parsed = pd.to_datetime(series, errors="coerce", utc=True)
        parsed = parsed.dropna()
        if not parsed.empty:
            col_data["min"] = parsed.min().isoformat()
            col_data["max"] = parsed.max().isoformat()
            col_data["unique_count"] = int(parsed.nunique())
    else:
        top_values = series.dropna().astype(str).value_counts().head(3).to_dict()
        if top_values:
            col_data["top_values"] = top_values

    return col, col_data, inferred, bool(constant), bool(near_constant)


def build_data_profile(df: pd.DataFrame) -> Dict[str, Any]:
    row_count = int(df.shape[0])
    column_count = int(df.shape[1])

    columns: Dict[str, Any] = {}
    constant_columns: List[str] = []
    near_constant_columns: List[str] = []
    column_types: Dict[str, List[str]] = {
        "numeric": [],
        "categorical": [],
        "datetime": [],
        "text": [],
        "boolean": [],
    }

    # Profile all columns in parallel; each column is fully independent
    n_workers = min(16, max(1, len(df.columns)))
    with ThreadPoolExecutor(max_workers=n_workers) as pool:
        col_results = list(pool.map(
            _profile_single_column,
            [(col, df[col], row_count) for col in df.columns],
        ))

    # Aggregate results sequentially (safe — no concurrency here)
    for col, col_data, inferred, is_const, is_near_const in col_results:
        columns[col] = col_data
        column_types[inferred].append(col)
        if is_const:
            constant_columns.append(col)
        elif is_near_const:
            near_constant_columns.append(col)

    missing_pcts = [meta["missing_pct"] for meta in columns.values()]
    profile = {
        "row_count": row_count,
        "column_count": column_count,
        "column_types": column_types,
        "columns": columns,
        "missingness_summary": {
            "avg_missing_pct": round(float(np.mean(missing_pcts)) if missing_pcts else 0.0, 4),
            "max_missing_pct": round(float(np.max(missing_pcts)) if missing_pcts else 0.0, 4),
        },
        "constant_columns": constant_columns,
        "near_constant_columns": near_constant_columns,
        "status": "success",
        "valid": True,
    }
    return profile
