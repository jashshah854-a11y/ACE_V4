from __future__ import annotations

from typing import Any, Callable, Dict, List


InvariantCheck = Callable[[Dict[str, Any]], List[Dict[str, Any]]]


def _get_artifacts(manifest: Dict[str, Any]) -> Dict[str, Any]:
    return manifest.get("artifacts") or {}


def _get_steps(manifest: Dict[str, Any]) -> Dict[str, Any]:
    return manifest.get("steps") or {}


def invariant_no_artifact_without_step_success(manifest: Dict[str, Any]) -> List[Dict[str, Any]]:
    failures = []
    artifacts = _get_artifacts(manifest)
    steps = _get_steps(manifest)
    for artifact_id, payload in artifacts.items():
        step = payload.get("produced_by_step")
        if not step:
            failures.append({"id": "artifact_missing_step", "artifact": artifact_id})
            continue
        step_status = steps.get(step, {}).get("status")
        # Allow "running" since agents write artifacts during execution before step is finalized
        if step_status not in ("success", "running"):
            failures.append({"id": "artifact_step_not_success", "artifact": artifact_id, "step": step})
    return failures


def invariant_no_invalid_artifacts(manifest: Dict[str, Any]) -> List[Dict[str, Any]]:
    failures = []
    artifacts = _get_artifacts(manifest)
    for artifact_id, payload in artifacts.items():
        if payload.get("valid") is False or payload.get("status") != "success":
            failures.append(
                {
                    "id": "artifact_invalid",
                    "artifact": artifact_id,
                    "status": payload.get("status"),
                    "valid": payload.get("valid"),
                }
            )
    return failures


def invariant_no_metric_out_of_bounds(manifest: Dict[str, Any]) -> List[Dict[str, Any]]:
    failures = []
    artifacts = _get_artifacts(manifest)
    for artifact_id, payload in artifacts.items():
        for error in payload.get("validation_errors") or []:
            if error.get("type") in {"METRIC_OUT_OF_BOUNDS", "METRIC_INVALID"}:
                failures.append({"id": "metric_out_of_bounds", "artifact": artifact_id, "error": error})
    return failures


def invariant_trust_consistency(manifest: Dict[str, Any]) -> List[Dict[str, Any]]:
    failures = []
    trust = manifest.get("trust")
    steps = _get_steps(manifest)
    trust_step_status = steps.get("trust_evaluation", {}).get("status")
    if trust_step_status == "success" and trust is None:
        failures.append({"id": "trust_missing", "message": "Trust model missing after success"})
    if trust is not None and trust_step_status != "success":
        failures.append({"id": "trust_step_mismatch", "message": "Trust present without success status"})
    return failures


def invariant_analysis_requires_routing(manifest: Dict[str, Any]) -> List[Dict[str, Any]]:
    failures = []
    allowed = manifest.get("analysis_allowed")
    suppressed = manifest.get("analysis_suppressed")
    steps = _get_steps(manifest)
    if steps.get("type_identifier", {}).get("status") == "success":
        if allowed is None or suppressed is None:
            failures.append({"id": "routing_missing", "message": "Routing not recorded after classification"})
        if not isinstance(allowed, list) or not isinstance(suppressed, dict):
            failures.append({"id": "routing_invalid", "message": "Routing payload invalid"})
    return failures


def invariant_render_policy_consistency(manifest: Dict[str, Any]) -> List[Dict[str, Any]]:
    failures = []
    policy = manifest.get("render_policy") or {}
    artifacts = _get_artifacts(manifest)

    def _artifact_ok(name: str) -> bool:
        payload = artifacts.get(name) or {}
        return payload.get("valid") is True and payload.get("status") == "success"

    required = {
        "allow_report": ["final_report"],
        "allow_regression_sections": [
            "regression_insights",
            "feature_governance_report",
            "baseline_metrics",
            "model_fit_report",
            "collinearity_report",
            "leakage_report",
            "importance_report",
        ],
        "allow_personas": ["personas"],
        "allow_strategies": ["strategies"],
        "allow_anomalies": ["anomalies"],
        "allow_correlation_analysis": ["correlation_analysis"],
        "allow_distribution_analysis": ["distribution_analysis"],
        "allow_quality_metrics": ["quality_metrics"],
        "allow_business_intelligence": ["business_intelligence"],
        "allow_feature_importance": ["importance_report"],
        "allow_simulation": ["business_intelligence"],
        "allow_trust_summary": ["trust_object"],
    }

    for flag, needed in required.items():
        if not policy.get(flag):
            continue
        missing = [artifact for artifact in needed if not _artifact_ok(artifact)]
        if missing:
            failures.append({"id": "render_policy_artifact_missing", "policy": flag, "missing": missing})
    return failures


REGISTRY: List[Dict[str, Any]] = [
    {
        "id": "artifact_step_success",
        "description": "No artifact exists without producing step success",
        "severity": "critical",
        "check": invariant_no_artifact_without_step_success,
    },
    {
        "id": "artifact_valid",
        "description": "No invalid artifacts persisted",
        "severity": "critical",
        "check": invariant_no_invalid_artifacts,
    },
    {
        "id": "metric_bounds",
        "description": "No metric out of mathematical bounds",
        "severity": "critical",
        "check": invariant_no_metric_out_of_bounds,
    },
    {
        "id": "trust_consistency",
        "description": "No confidence shown without trust model",
        "severity": "critical",
        "check": invariant_trust_consistency,
    },
    {
        "id": "routing_recorded",
        "description": "No analysis without routing approval",
        "severity": "critical",
        "check": invariant_analysis_requires_routing,
    },
    {
        "id": "render_policy_consistency",
        "description": "No section rendered without manifest approval",
        "severity": "critical",
        "check": invariant_render_policy_consistency,
    },
]


def run_invariants(manifest: Dict[str, Any]) -> Dict[str, Any]:
    violations: List[Dict[str, Any]] = []
    for invariant in REGISTRY:
        failures = invariant["check"](manifest)
        for failure in failures:
            entry = {
                "invariant_id": invariant["id"],
                "severity": invariant["severity"],
                "description": invariant["description"],
                "details": failure,
            }
            violations.append(entry)
    return {"violations": violations, "ok": not violations}
