import json
from pathlib import Path
from typing import Dict, List


REQUIRED_INSIGHT_KEYS = ["columns_used", "metric_name", "metric_value", "method", "evidence_ref"]


def validate_insights(insights: List[Dict]) -> Dict:
    """
    Validate insight objects for provenance completeness.
    Returns a report with missing keys and a pass/fail flag.
    """
    missing = []
    for idx, insight in enumerate(insights):
        missing_keys = [k for k in REQUIRED_INSIGHT_KEYS if k not in insight or insight.get(k) in (None, "", [])]
        if missing_keys:
            missing.append({"index": idx, "missing": missing_keys})
    return {"ok": len(missing) == 0, "missing": missing}


def load_insights(path: Path) -> List[Dict]:
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_insights(path: Path, insights: List[Dict]):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(insights, f, indent=2)
    tmp.replace(path)

