import json
from pathlib import Path
from typing import Dict, Any, Optional


def build_identity_card(
    schema_profile: Dict[str, Any],
    data_type: Optional[Dict[str, Any]] = None,
    drift_report: Optional[Dict[str, Any]] = None,
    source_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build a Dataset Identity Card (DIC) summarizing structure, quality, and domain.
    """
    card = {
        "source_path": source_path,
        "row_count": schema_profile.get("row_count"),
        "column_count": schema_profile.get("column_count"),
        "columns": schema_profile.get("columns", {}),
        "data_type": data_type or {},
        "quality": {},
        "drift_status": (drift_report or {}).get("status"),
    }

    # Quality: missing and distinct stats
    cols = schema_profile.get("columns", {})
    if cols:
        null_pcts = [c.get("null_pct", 0) or 0 for c in cols.values()]
        card["quality"]["avg_null_pct"] = round(sum(null_pcts) / max(len(null_pcts), 1), 4)
        card["quality"]["max_null_pct"] = round(max(null_pcts), 4)

        distinct_pcts = [c.get("distinct_pct", 0) or 0 for c in cols.values()]
        card["quality"]["avg_distinct_pct"] = round(sum(distinct_pcts) / max(len(distinct_pcts), 1), 4)
    return card


def save_identity_card(path: Path, card: Dict[str, Any]):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(card, f, indent=2)
    tmp.replace(path)

