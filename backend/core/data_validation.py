from __future__ import annotations

import math
from typing import Dict, List, Optional, Set

import pandas as pd

from core.data_typing import confidence_label


def _detect_target(df: pd.DataFrame, run_config: Dict, schema_map: Optional[Dict]) -> Optional[str]:
    preferred = (run_config or {}).get("target_column")
    if preferred and preferred in df.columns:
        return preferred

    if schema_map:
        roles = schema_map.get("semantic_roles") or {}
        value_like = roles.get("value_like") if isinstance(roles, dict) else None
        if value_like:
            if isinstance(value_like, list):
                for candidate in value_like:
                    if candidate in df.columns:
                        return candidate
            elif isinstance(value_like, str) and value_like in df.columns:
                return value_like

    # simple heuristic: look for revenue/amount/value columns
    for col in df.columns:
        low = col.lower()
        if any(token in low for token in ["revenue", "amount", "value", "target", "label", "score", "price", "cost", "profit"]):
            return col
    return None


def _time_coverage_days(df: pd.DataFrame) -> Optional[float]:
    datetime_cols = [c for c in df.columns if "date" in c.lower() or "time" in c.lower()]
    for col in datetime_cols:
        try:
            series = pd.to_datetime(df[col], errors="coerce")
            if series.notna().sum() < 2:
                continue
            span = (series.max() - series.min()).total_seconds() / 86400
            if span is not None and not math.isnan(span):
                return span
        except Exception:
            continue
    return None


def validate_dataset(df: pd.DataFrame, run_config: Dict, schema_map: Optional[Dict], data_type: Optional[Dict]) -> Dict:
    checks: Dict[str, Dict] = {}
    blocked: Set[str] = set()
    notes: List[str] = []

    row_count = len(df)
    col_count = len(df.columns)

    # Sample size check
    min_rows = 50
    checks["sample_size"] = {
        "ok": row_count >= min_rows,
        "detail": f"Rows={row_count}, min_required={min_rows}",
    }
    if row_count < min_rows:
        blocked.update({"overseer", "regression", "personas", "fabricator"})
        notes.append("Sample size below minimum for modeling; operating in limitation mode.")

    # Target variable
    target_col = _detect_target(df, run_config, schema_map)
    checks["target_variable"] = {"ok": bool(target_col), "detail": target_col or "Not found"}
    not_applicable_agents: Set[str] = set()
    if not target_col:
        not_applicable_agents.update({"regression", "fabricator"})
        notes.append("No suitable target variable detected; predictive agents marked not applicable.")

    # Variance check on target
    if target_col:
        series = pd.to_numeric(df[target_col], errors="coerce")
        usable = series.dropna()
        var_ok = len(usable) >= 10 and usable.std(ddof=0) > 0 and usable.nunique() >= 3
        checks["variance"] = {
            "ok": var_ok,
            "detail": f"usable={len(usable)}, std={series.std(ddof=0):.4f} unique={series.nunique()}",
        }
        if not var_ok:
            blocked.update({"regression", "fabricator"})
            notes.append("Target lacks variance; predictive modeling disabled.")
    else:
        checks["variance"] = {"ok": True, "detail": "No target to assess", "applicable": False}

    # Time coverage
    coverage_days = _time_coverage_days(df)
    if coverage_days is None:
        checks["time_coverage"] = {"ok": False, "detail": "No time field with coverage"}
        notes.append("Time coverage unknown; treat any trend/forecasting as exploratory only.")
    else:
        checks["time_coverage"] = {
            "ok": coverage_days >= 14,
            "detail": f"{coverage_days:.1f} days",
        }
        if coverage_days < 14:
            notes.append("Time coverage under two weeks; trend/forecast statements downgraded to exploratory.")

    # Observational vs causal
    checks["causal_context"] = {
        "ok": False,
        "detail": "No causal design detected; analysis treated as observational.",
    }
    notes.append("Dataset treated as observational; causal claims are prohibited.")

    allow_insights = not checks["sample_size"]["ok"] is False
    mode = "insight" if allow_insights and not blocked else "limitations"

    # Determine confidence label based on failures
    # Fix: Don't penalize confidence for observational data (causal_context)
    failed = [k for k, v in checks.items() if not v["ok"] and k != "causal_context"]
    confidence_score = max(0.1, 1 - (len(failed) * 0.15))

    report = {
        "allow_insights": allow_insights,
        "mode": mode,
        "blocked_agents": sorted(blocked),
        "not_applicable_agents": sorted(not_applicable_agents),
        "checks": checks,
        "row_count": row_count,
        "column_count": col_count,
        "target_column": target_col,
        "confidence": round(confidence_score, 3),
        "confidence_label": confidence_label(confidence_score),
        "notes": notes,
        "data_type": data_type,
    }

    return report










