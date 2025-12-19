import json
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd


def _safe_float(val):
    try:
        return float(val)
    except Exception:
        return None


def profile_dataframe(df: pd.DataFrame) -> Dict:
    """Compute lightweight schema/profile stats for a dataframe sample."""
    profile = {
        "row_count": int(len(df)),
        "column_count": int(len(df.columns)),
        "columns": {},
    }

    for col in df.columns:
        series = df[col]
        col_profile = {
            "dtype": str(series.dtype),
            "null_pct": float(series.isna().mean()) if len(series) else 0.0,
            "distinct_pct": float(series.nunique(dropna=True) / len(series)) if len(series) else 0.0,
        }

        if pd.api.types.is_numeric_dtype(series):
            col_profile.update(
                {
                    "min": _safe_float(series.min()),
                    "max": _safe_float(series.max()),
                    "mean": _safe_float(series.mean()),
                    "std": _safe_float(series.std(ddof=0)),
                    "p25": _safe_float(series.quantile(0.25)),
                    "p50": _safe_float(series.quantile(0.5)),
                    "p75": _safe_float(series.quantile(0.75)),
                }
            )
        else:
            lengths = series.dropna().astype(str).str.len()
            col_profile.update(
                {
                    "text_len_mean": _safe_float(lengths.mean()) if len(lengths) else None,
                    "text_len_p95": _safe_float(lengths.quantile(0.95)) if len(lengths) else None,
                }
            )

        profile["columns"][str(col)] = col_profile

    return profile


def _psi(base: np.ndarray, curr: np.ndarray, eps: float = 1e-6) -> float:
    """Population Stability Index between two distributions."""
    base = np.clip(base, eps, 1)
    curr = np.clip(curr, eps, 1)
    return float(np.sum((curr - base) * np.log(curr / base)))


def _hist_from_edges(series: pd.Series, edges: np.ndarray) -> np.ndarray:
    if len(edges) < 2:
        return np.array([1.0])
    hist, _ = np.histogram(series.dropna(), bins=edges)
    if hist.sum() == 0:
        return np.zeros_like(hist, dtype=float)
    return hist / hist.sum()


def _ks_stat(sample_a: np.ndarray, sample_b: np.ndarray) -> float:
    """Lightweight KS statistic without scipy."""
    a = np.sort(sample_a)
    b = np.sort(sample_b)
    # merged unique values
    vals = np.concatenate([a, b])
    vals = np.unique(vals)
    if len(vals) == 0:
        return 0.0
    cdf_a = np.searchsorted(a, vals, side="right") / max(len(a), 1)
    cdf_b = np.searchsorted(b, vals, side="right") / max(len(b), 1)
    return float(np.max(np.abs(cdf_a - cdf_b)))


def _freq_delta(base_counts: Dict[str, int], cur_counts: Dict[str, int]) -> float:
    """Max absolute frequency delta between two categorical distributions."""
    keys = set(base_counts) | set(cur_counts)
    total_b = sum(base_counts.values()) or 1
    total_c = sum(cur_counts.values()) or 1
    deltas = []
    for k in keys:
        pb = base_counts.get(k, 0) / total_b
        pc = cur_counts.get(k, 0) / total_c
        deltas.append(abs(pb - pc))
    return max(deltas) if deltas else 0.0


def compute_drift_report(
    baseline: Dict,
    current: Dict,
    *,
    psi_warn: float = 0.1,
    psi_block: float = 0.25,
    cat_warn: float = 0.1,
) -> Dict:
    """Compare current profile to baseline and emit drift signals."""
    drift = {"columns": {}, "status": "none", "summary": []}
    warn = False
    block = False

    base_cols = baseline.get("columns", {})
    cur_cols = current.get("columns", {})

    quantiles = [0.0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0]

    for col, base_meta in base_cols.items():
        cur_meta = cur_cols.get(col)
        if not cur_meta:
            continue

        if "mean" in base_meta and base_meta["mean"] is not None and "mean" in cur_meta:
            # numeric PSI
            # Reconstruct distributions from quantiles on available data
            # fall back to standard PSI bins on current data
            # note: we cannot recompute from meta only; this is an approximate signal
            # In absence of raw series here, mark as unchecked.
            drift["columns"][col] = {"checked": False, "reason": "raw data not available in profile"}
            continue

    # Because we do not have raw series here, emit a conservative status based on null/distinct deltas
    for col, base_meta in base_cols.items():
        cur_meta = cur_cols.get(col)
        if not cur_meta:
            continue
        null_delta = abs((cur_meta.get("null_pct", 0) or 0) - (base_meta.get("null_pct", 0) or 0))
        distinct_delta = abs((cur_meta.get("distinct_pct", 0) or 0) - (base_meta.get("distinct_pct", 0) or 0))
        combined = null_delta + distinct_delta
        status = "stable"
        if combined >= psi_block:
            status = "block"
            block = True
        elif combined >= psi_warn:
            status = "warn"
            warn = True
        drift["columns"][col] = {
            "null_delta": round(null_delta, 4),
            "distinct_delta": round(distinct_delta, 4),
            "status": status,
        }

    if block:
        drift["status"] = "block"
        drift["summary"].append("Significant profile drift detected.")
    elif warn:
        drift["status"] = "warn"
        drift["summary"].append("Profile drift warnings detected.")
    else:
        drift["status"] = "none"
        drift["summary"].append("No material profile drift detected.")

    return drift


def compute_recency_drift(
    recent_df: pd.DataFrame,
    older_df: pd.DataFrame,
    *,
    psi_warn: float = 0.1,
    psi_block: float = 0.25,
    cat_warn: float = 0.1,
) -> Dict:
    """
    Compare recent window to older window to detect recency drift.
    """
    return compute_sample_drift(
        older_df,
        recent_df,
        psi_warn=psi_warn,
        psi_block=psi_block,
        cat_warn=cat_warn,
    )


def compute_sample_drift(
    baseline_df: pd.DataFrame,
    current_df: pd.DataFrame,
    *,
    psi_warn: float = 0.1,
    psi_block: float = 0.25,
    cat_warn: float = 0.1,
) -> Dict:
    """
    Stronger drift based on raw samples (numeric PSI/KS, categorical freq delta).
    """
    drift = {"columns": {}, "status": "none", "summary": []}
    warn = False
    block = False

    # Align columns
    common_cols = [c for c in baseline_df.columns if c in current_df.columns]

    for col in common_cols:
        b = baseline_df[col]
        c = current_df[col]
        entry = {"status": "stable"}

        if pd.api.types.is_numeric_dtype(b) and pd.api.types.is_numeric_dtype(c):
            b_num = pd.to_numeric(b, errors="coerce").dropna()
            c_num = pd.to_numeric(c, errors="coerce").dropna()
            if len(b_num) >= 10 and len(c_num) >= 10:
                # bin edges from combined quantiles
                edges = np.quantile(
                    np.concatenate([b_num, c_num]),
                    [0.0, 0.05, 0.25, 0.5, 0.75, 0.95, 1.0],
                )
                edges = np.unique(edges)
                if len(edges) >= 2:
                    base_hist = _hist_from_edges(b_num, edges)
                    cur_hist = _hist_from_edges(c_num, edges)
                    psi_val = _psi(base_hist, cur_hist)
                else:
                    psi_val = 0.0
                ks_val = _ks_stat(b_num.values, c_num.values)
                entry.update({"psi": psi_val, "ks": ks_val})
                if psi_val >= psi_block or ks_val >= 0.5:
                    entry["status"] = "block"
                    block = True
                elif psi_val >= psi_warn or ks_val >= 0.3:
                    entry["status"] = "warn"
                    warn = True
            else:
                entry["status"] = "unchecked"
                entry["reason"] = "insufficient numeric samples"
        else:
            # categorical / object frequency delta
            b_counts = b.astype(str).value_counts().to_dict()
            c_counts = c.astype(str).value_counts().to_dict()
            delta = _freq_delta(b_counts, c_counts)
            entry["freq_delta"] = round(delta, 4)
            if delta >= psi_block:
                entry["status"] = "block"
                block = True
            elif delta >= cat_warn:
                entry["status"] = "warn"
                warn = True

        drift["columns"][col] = entry

    if block:
        drift["status"] = "block"
        drift["summary"].append("Significant sample drift detected.")
    elif warn:
        drift["status"] = "warn"
        drift["summary"].append("Sample drift warnings detected.")
    else:
        drift["status"] = "none"
        drift["summary"].append("No material sample drift detected.")

    return drift


def save_json(path: Path, payload: Dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    tmp.replace(path)

