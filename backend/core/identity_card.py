import json
from pathlib import Path
from typing import Dict, Any, Optional

FINANCIAL_TOKENS = [
    "revenue",
    "price",
    "cost",
    "spend",
    "budget",
    "amount",
    "profit",
    "income",
    "sales",
    "margin",
]

TIME_TOKENS = ["date", "time", "year", "month", "day", "week", "timestamp", "period"]


def build_identity_card(
    schema_profile: Dict[str, Any],
    data_type: Optional[Dict[str, Any]] = None,
    drift_report: Optional[Dict[str, Any]] = None,
    source_path: Optional[str] = None,
) -> Dict[str, Any]:
    """Build a Dataset Identity Card (DIC) summarizing structure, quality, and domain."""
    columns = schema_profile.get("columns", {})

    card = {
        "source_path": source_path,
        "row_count": schema_profile.get("row_count"),
        "column_count": schema_profile.get("column_count"),
        "columns": columns,
        "data_type": data_type or {},
        "quality": {},
        "drift_status": (drift_report or {}).get("status"),
    }

    # Quality: missing and distinct stats
    critical_gap_score = 0.0
    is_safe_mode = False

    if columns:
        null_pcts = [c.get("null_pct", 0) or 0 for c in columns.values()]
        card["quality"]["avg_null_pct"] = round(sum(null_pcts) / max(len(null_pcts), 1), 4)
        card["quality"]["max_null_pct"] = round(max(null_pcts), 4)
        critical_gap_score = round(max(null_pcts), 4)

        distinct_pcts = [c.get("distinct_pct", 0) or 0 for c in columns.values()]
        card["quality"]["avg_distinct_pct"] = round(sum(distinct_pcts) / max(len(distinct_pcts), 1), 4)

    # Trust Schema / Safe Mode Triggers
    row_count = schema_profile.get("row_count", 0) or 0
    if critical_gap_score > 0.40:
        is_safe_mode = True
    if row_count < 50:
        is_safe_mode = True

    card["critical_gap_score"] = critical_gap_score
    card["is_safe_mode"] = is_safe_mode
    card["capabilities"] = _detect_capabilities(columns)

    return card


def _detect_capabilities(columns: Dict[str, Any]) -> Dict[str, bool]:
    if not columns:
        return {
            "has_financial_columns": False,
            "has_time_series": False,
            "has_categorical": False,
            "has_numeric": False,
        }

    names = [str(name).lower() for name in columns.keys()]
    has_financial = any(any(token in name for token in FINANCIAL_TOKENS) for name in names)
    has_time = any(any(token in name for token in TIME_TOKENS) for name in names)

    has_numeric = False
    has_categorical = False
    for meta in columns.values():
        dtype = str(meta.get("dtype") or meta.get("type") or "").lower()
        if any(token in dtype for token in ("int", "float", "double", "decimal", "number")):
            has_numeric = True
        distinct_pct = meta.get("distinct_pct")
        if dtype in {"object", "category", "string"} or (
            isinstance(distinct_pct, (int, float)) and distinct_pct is not None and distinct_pct < 0.2
        ):
            has_categorical = True

    return {
        "has_financial_columns": has_financial,
        "has_time_series": has_time,
        "has_categorical": has_categorical,
        "has_numeric": has_numeric,
    }


def save_identity_card(path: Path, card: Dict[str, Any]):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(card, f, indent=2)
    tmp.replace(path)
