"""
Data Validation for ACE V4

Validates dataset sufficiency and determines analysis mode.
Provides user-friendly messages explaining WHY analysis is limited
and actionable recommendations for improvement.
"""

from __future__ import annotations

import math
from typing import Dict, List, Optional, Set

import pandas as pd

from core.data_typing import confidence_label
from core.datetime_utils import coerce_datetime


# User-friendly validation messages with explanations and recommendations
VALIDATION_MESSAGES = {
    "sample_size_low": {
        "short": "Dataset too small for reliable analysis",
        "explanation": "ACE needs at least 50 rows to perform meaningful statistical analysis. "
                      "With fewer rows, patterns detected may be due to random chance rather than real trends.",
        "recommendation": "Add more data rows to your dataset, or use this analysis for exploratory purposes only.",
        "impact": "Predictive modeling and clustering are disabled."
    },
    "no_target": {
        "short": "No target variable detected",
        "explanation": "ACE couldn't identify a column to predict (like revenue, churn, or outcome). "
                      "Without a clear target, predictive analysis isn't possible.",
        "recommendation": "Specify a target column in your analysis request, or add a column representing "
                         "the outcome you want to predict.",
        "impact": "Predictive modeling is not applicable for this dataset."
    },
    "low_variance": {
        "short": "Target variable lacks variation",
        "explanation": "The target column has too little variation - it's mostly the same value. "
                      "Machine learning needs variation to learn meaningful patterns.",
        "recommendation": "Check if your target column is correct. If the target genuinely has low variance, "
                         "consider using a different analysis approach or gathering more diverse data.",
        "impact": "Predictive modeling is disabled."
    },
    "no_time_coverage": {
        "short": "No time dimension detected",
        "explanation": "ACE couldn't find date/time columns to analyze trends over time. "
                      "Trend and forecast insights require temporal data.",
        "recommendation": "If your data has dates, ensure they're in a recognizable format (YYYY-MM-DD). "
                         "If analyzing point-in-time data, trend analysis won't apply.",
        "impact": "Trend and forecast statements are exploratory only."
    },
    "short_time_coverage": {
        "short": "Limited time span in data",
        "explanation": "Your data covers less than 2 weeks. Short time spans make it hard to distinguish "
                      "real trends from temporary fluctuations.",
        "recommendation": "Include data from a longer time period (ideally 30+ days) for reliable trend analysis.",
        "impact": "Trend and forecast statements are exploratory only."
    },
    "observational_data": {
        "short": "Observational data only",
        "explanation": "This dataset appears to be observational (not from a controlled experiment). "
                      "ACE can find correlations and patterns, but cannot prove cause-and-effect relationships.",
        "recommendation": "Interpret results as associations, not causal claims. For causal analysis, "
                         "consider conducting A/B tests or controlled experiments.",
        "impact": "Causal claims are prohibited in the analysis."
    },
    "drift_detected": {
        "short": "Data distribution has changed",
        "explanation": "The data patterns appear different from typical distributions. This could indicate "
                      "data quality issues, seasonal effects, or genuine changes in the underlying process.",
        "recommendation": "Review recent data for anomalies or data entry issues. If the drift is expected "
                         "(e.g., seasonal), note this context when interpreting results.",
        "impact": "Analysis proceeds with caution flag."
    }
}


def _get_user_friendly_message(key: str) -> Dict:
    """Get user-friendly message for a validation issue."""
    return VALIDATION_MESSAGES.get(key, {
        "short": "Validation issue detected",
        "explanation": "A data quality check did not pass.",
        "recommendation": "Review your data for potential issues.",
        "impact": "Some analysis features may be limited."
    })


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
            series = coerce_datetime(df[col])
            if series.notna().sum() < 2:
                continue
            span = (series.max() - series.min()).total_seconds() / 86400
            if span is not None and not math.isnan(span):
                return span
        except Exception:
            continue
    return None


def validate_dataset(df: pd.DataFrame, run_config: Dict, schema_map: Optional[Dict], data_type: Optional[Dict]) -> Dict:
    """
    Validate dataset sufficiency and determine analysis mode.

    Returns a comprehensive report with:
    - User-friendly explanations of any issues
    - Actionable recommendations for improvements
    - Clear impact statements for each limitation
    """
    checks: Dict[str, Dict] = {}
    blocked: Set[str] = set()
    notes: List[str] = []
    user_messages: List[Dict] = []  # User-friendly messages

    row_count = len(df)
    col_count = len(df.columns)

    # Sample size check
    min_rows = 50
    sample_ok = row_count >= min_rows
    checks["sample_size"] = {
        "ok": sample_ok,
        "detail": f"Rows={row_count}, min_required={min_rows}",
    }
    if not sample_ok:
        blocked.update({"overseer", "regression", "personas", "fabricator"})
        notes.append("Sample size below minimum for modeling; operating in limitation mode.")
        msg = _get_user_friendly_message("sample_size_low")
        msg["rows_found"] = row_count
        msg["rows_needed"] = min_rows
        user_messages.append(msg)

    # Target variable
    target_col = _detect_target(df, run_config, schema_map)
    checks["target_variable"] = {"ok": bool(target_col), "detail": target_col or "Not found"}
    not_applicable_agents: Set[str] = set()
    if not target_col:
        not_applicable_agents.update({"regression", "fabricator"})
        notes.append("No suitable target variable detected; predictive agents marked not applicable.")
        user_messages.append(_get_user_friendly_message("no_target"))

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
            msg = _get_user_friendly_message("low_variance")
            msg["target_column"] = target_col
            msg["unique_values"] = int(series.nunique())
            user_messages.append(msg)
    else:
        checks["variance"] = {"ok": True, "detail": "No target to assess", "applicable": False}

    # Time coverage
    coverage_days = _time_coverage_days(df)
    if coverage_days is None:
        checks["time_coverage"] = {"ok": False, "detail": "No time field with coverage"}
        notes.append("Time coverage unknown; treat any trend/forecasting as exploratory only.")
        user_messages.append(_get_user_friendly_message("no_time_coverage"))
    else:
        checks["time_coverage"] = {
            "ok": coverage_days >= 14,
            "detail": f"{coverage_days:.1f} days",
        }
        if coverage_days < 14:
            notes.append("Time coverage under two weeks; trend/forecast statements downgraded to exploratory.")
            msg = _get_user_friendly_message("short_time_coverage")
            msg["days_found"] = round(coverage_days, 1)
            msg["days_recommended"] = 14
            user_messages.append(msg)

    # Observational vs causal
    checks["causal_context"] = {
        "ok": False,
        "detail": "No causal design detected; analysis treated as observational.",
    }
    notes.append("Dataset treated as observational; causal claims are prohibited.")
    # Only add observational message if other issues exist (it's expected for most datasets)
    if len(user_messages) == 0:
        user_messages.append(_get_user_friendly_message("observational_data"))

    allow_insights = not checks["sample_size"]["ok"] is False
    mode = "insight" if allow_insights and not blocked else "limitations"

    # Determine confidence label based on failures
    # Fix: Don't penalize confidence for observational data (causal_context)
    failed = [k for k, v in checks.items() if not v["ok"] and k != "causal_context"]
    confidence_score = max(0.1, 1 - (len(failed) * 0.15))

    # Build user-friendly summary
    if mode == "limitations":
        summary = (
            f"Your analysis is running in **limited mode** due to {len(user_messages)} data quality issue(s). "
            f"See the recommendations below to improve your analysis results."
        )
    elif user_messages:
        summary = (
            f"Your analysis can proceed, but {len(user_messages)} consideration(s) may affect the results. "
            f"Review the notes below for context."
        )
    else:
        summary = "Your data passed all quality checks. Full analysis is available."

    report = {
        "allow_insights": allow_insights,
        "mode": mode,
        "can_proceed": mode != "limitations" or allow_insights,
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
        # User-friendly additions
        "summary": summary,
        "user_messages": user_messages,
        "issues_count": len(user_messages),
        "recommendation_summary": _build_recommendation_summary(user_messages),
    }

    return report


def _build_recommendation_summary(messages: List[Dict]) -> str:
    """Build a consolidated recommendation summary from all validation messages."""
    if not messages:
        return "No specific recommendations - your data quality is good."

    recommendations = []
    for i, msg in enumerate(messages, 1):
        rec = msg.get("recommendation", "Review this issue.")
        recommendations.append(f"{i}. {rec}")

    return "\n".join(recommendations)










