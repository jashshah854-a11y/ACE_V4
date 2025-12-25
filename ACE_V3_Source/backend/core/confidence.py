import math
from typing import Dict


def compute_data_confidence(identity_card: Dict, validation_report: Dict, drift_status: str = "none") -> Dict:
    """
    Compute a simple data confidence score from identity card + validation + drift.
    """
    score = 1.0
    reasons = []

    quality = identity_card.get("quality", {})
    max_null = quality.get("max_null_pct", 0) or 0
    avg_null = quality.get("avg_null_pct", 0) or 0
    if max_null > 0.5:
        score -= 0.3
        reasons.append("High null rate in at least one column.")
    elif avg_null > 0.2:
        score -= 0.15
        reasons.append("Elevated average null rate.")

    if drift_status == "block":
        score -= 0.4
        reasons.append("Blocking drift detected.")
    elif drift_status == "warn":
        score -= 0.15
        reasons.append("Drift warnings present.")

    # Validation checks
    checks = (validation_report or {}).get("checks", {})
    if not checks.get("sample_size", {}).get("ok", True):
        score -= 0.25
        reasons.append("Sample size below minimum.")
    if not checks.get("variance", {}).get("ok", True):
        score -= 0.2
        reasons.append("Target variance insufficient.")
    if validation_report and validation_report.get("mode") == "limitations":
        score -= 0.2

    score = max(0.0, min(1.0, score))
    label = "high" if score >= 0.75 else "moderate" if score >= 0.45 else "low"
    return {
        "data_confidence": round(score, 3),
        "confidence_label": label,
        "reasons": reasons,
    }

