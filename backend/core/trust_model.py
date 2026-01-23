from __future__ import annotations

from typing import Any, Dict, List, Optional


COMPONENT_KEYS = [
    "data_quality",
    "model_fit",
    "stability",
    "validation_strength",
    "leakage_risk",
]

WEIGHTS = {
    "data_quality": 1.0,
    "model_fit": 0.8,
    "stability": 0.8,
    "validation_strength": 0.7,
    "leakage_risk": 1.0,
}


def _status_for_score(score: Optional[float]) -> str:
    if score is None:
        return "unknown"
    if score >= 80:
        return "high"
    if score >= 60:
        return "medium"
    return "low"


def _artifact_valid(manifest: Dict[str, Any], artifact_id: str) -> bool:
    artifact = (manifest.get("artifacts") or {}).get(artifact_id) or {}
    return artifact.get("valid") is True and artifact.get("status") == "success"


def _step_status(manifest: Dict[str, Any], step: str) -> str:
    return (manifest.get("steps") or {}).get(step, {}).get("status") or "not_started"


def compute_trust_from_manifest(manifest: Dict[str, Any]) -> Dict[str, Any]:
    warnings = manifest.get("warnings") or []
    warning_codes = {w.get("warning_code") for w in warnings if isinstance(w, dict)}

    components: Dict[str, Dict[str, Any]] = {}
    caps: List[Dict[str, Any]] = []

    validator_status = _step_status(manifest, "validator")
    regression_status = _step_status(manifest, "regression")

    # data_quality
    dq_evidence = ["steps.validator"]
    dq_score: Optional[float] = None
    dq_notes = "Validator status not successful."
    if validator_status == "success":
        dq_score = 70.0
        dq_notes = "Validator completed successfully."
        if _artifact_valid(manifest, "quality_metrics"):
            dq_score = 80.0
            dq_notes = "Quality metrics artifact validated."
            dq_evidence.append("artifacts.quality_metrics")
        if _artifact_valid(manifest, "dataset_identity_card"):
            dq_evidence.append("artifacts.dataset_identity_card")
    components["data_quality"] = {
        "score": dq_score,
        "status": _status_for_score(dq_score),
        "evidence": dq_evidence,
        "notes": dq_notes,
    }

    # model_fit
    mf_evidence = ["steps.regression"]
    mf_score: Optional[float] = None
    mf_notes = "Regression did not complete."
    if regression_status == "success" and _artifact_valid(manifest, "regression_insights"):
        mf_score = 70.0
        mf_notes = "Regression artifacts validated."
        mf_evidence.append("artifacts.regression_insights")
    components["model_fit"] = {
        "score": mf_score,
        "status": _status_for_score(mf_score),
        "evidence": mf_evidence,
        "notes": mf_notes,
    }

    # stability
    stability_evidence: List[str] = []
    stability_score: Optional[float] = None
    stability_notes = "Stability diagnostics missing."
    has_correlation = _artifact_valid(manifest, "correlation_analysis")
    has_feature_importance = _artifact_valid(manifest, "feature_importance")
    if has_correlation:
        stability_evidence.append("artifacts.correlation_analysis")
    if has_feature_importance:
        stability_evidence.append("artifacts.feature_importance")

    if has_feature_importance:
        stability_score = 70.0
        stability_notes = "Feature importance diagnostics available."
    elif has_correlation:
        stability_score = 60.0
        stability_notes = "Correlation diagnostics available."
    else:
        stability_score = 40.0
    components["stability"] = {
        "score": stability_score,
        "status": _status_for_score(stability_score),
        "evidence": stability_evidence,
        "notes": stability_notes,
    }

    # validation_strength
    vs_evidence = ["steps.validator"]
    vs_score: Optional[float] = None
    vs_notes = "Validation step not successful."
    if validator_status == "success":
        vs_score = 60.0
        vs_notes = "Validation checks completed."
    elif validator_status == "failed":
        vs_score = 20.0
        vs_notes = "Validation failed."
    components["validation_strength"] = {
        "score": vs_score,
        "status": _status_for_score(vs_score),
        "evidence": vs_evidence,
        "notes": vs_notes,
    }

    # leakage_risk
    leakage_evidence: List[str] = []
    leakage_score = 10.0
    leakage_notes = "No leakage warning detected."
    if "DATA_LEAKAGE_POSSIBLE" in warning_codes:
        leakage_score = 80.0
        leakage_notes = "Potential leakage warning raised."
        leakage_evidence.append("warnings.DATA_LEAKAGE_POSSIBLE")
    components["leakage_risk"] = {
        "score": leakage_score,
        "status": _status_for_score(leakage_score),
        "evidence": leakage_evidence,
        "notes": leakage_notes,
    }

    weighted_scores: List[float] = []
    for name in COMPONENT_KEYS:
        score = components[name]["score"]
        if score is None:
            continue
        weight = WEIGHTS[name]
        if name == "leakage_risk":
            weighted_scores.append(max(0.0, 100.0 - (score * weight)))
        else:
            weighted_scores.append(max(0.0, score * weight))

    overall = min(weighted_scores) if weighted_scores else 0.0

    # Apply caps
    if components["leakage_risk"]["status"] == "high":
        caps.append({"code": "LEAKAGE_RISK_HIGH", "max": 40, "evidence": ["warnings.DATA_LEAKAGE_POSSIBLE"]})
    if regression_status in {"failed", "skipped", "not_started"}:
        caps.append({"code": "REGRESSION_NOT_SUCCESS", "max": 50, "evidence": ["steps.regression"]})
    if components["stability"]["status"] == "low":
        caps.append({"code": "STABILITY_LOW", "max": 60, "evidence": components["stability"]["evidence"]})

    unknown_count = sum(
        1 for name in COMPONENT_KEYS if components[name]["status"] == "unknown"
    )
    if unknown_count >= 1:
        max_value = 60 if unknown_count == 1 else 50
        caps.append({"code": "UNKNOWN_COMPONENTS", "max": max_value, "evidence": []})

    for cap in caps:
        overall = min(overall, float(cap["max"]))

    overall_confidence = max(0.0, min(100.0, overall))

    return {
        "overall_confidence": round(overall_confidence, 1),
        "components": components,
        "applied_caps": caps,
    }
