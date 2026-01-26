from __future__ import annotations

from typing import Dict, List, Tuple


def derive_routing(classification: Dict) -> Dict[str, Dict[str, str]]:
    allowed: List[str] = []
    suppressed: Dict[str, str] = {}

    domain_tags = [tag.get("tag") for tag in classification.get("domain_tags", []) if isinstance(tag, dict)]
    temporal = (classification.get("temporal_structure") or {}).get("tag") or "unknown"
    temporal_conf = float((classification.get("temporal_structure") or {}).get("confidence") or 0.0)

    low_confidence = temporal_conf < 0.4 or "unknown" in domain_tags

    # Core analyses always allowed
    allowed.extend(["quality", "distribution", "correlation"])

    if low_confidence:
        suppressed["segmentation"] = "Classification confidence low; suppressing advanced analyses."
        suppressed["regression"] = "Classification confidence low; suppressing advanced analyses."
        suppressed["personas"] = "Classification confidence low; suppressing advanced analyses."
        suppressed["forecasting"] = "Classification confidence low; suppressing advanced analyses."
        suppressed["simulation"] = "Classification confidence low; suppressing advanced analyses."
        return {"allowed": allowed, "suppressed": suppressed}

    if "accounting" in domain_tags and temporal == "time_series":
        allowed.extend(["trend_analysis", "forecasting", "regression"])
        suppressed["personas"] = "Accounting data does not support persona segmentation."
        suppressed["segmentation"] = "Accounting data does not support segmentation."
    elif "customer_behavior" in domain_tags and temporal == "cross_sectional":
        allowed.extend(["segmentation", "regression", "personas", "business_intelligence", "simulation"])
        suppressed["forecasting"] = "Cross-sectional customer data; forecasting disabled."
    elif temporal == "unknown":
        suppressed["forecasting"] = "Temporal structure unknown; time-based analyses disabled."
        allowed.extend(["segmentation", "regression"])
    elif temporal == "time_series":
        allowed.extend(["trend_analysis", "forecasting", "regression"])
    else:
        allowed.extend(["segmentation", "regression"])

    return {"allowed": allowed, "suppressed": suppressed}


def agent_analysis_map(agent: str) -> str:
    mapping = {
        "overseer": "segmentation",
        "regression": "regression",
        "personas": "personas",
        "fabricator": "personas",
        "sentry": "anomalies",
    }
    return mapping.get(agent, "")
