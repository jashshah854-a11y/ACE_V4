from __future__ import annotations

import json
import hashlib
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

MANIFEST_VERSION = "1.0"
PIPELINE_VERSION = "ace_v4_pipeline"
MANIFEST_NAME = "run_manifest.json"
MANIFEST_SEAL = "manifest_seal.json"

DEFAULT_STEPS = [
    "ingestion",
    "type_identifier",
    "validator",
    "scanner",
    "interpreter",
    "overseer",
    "regression",
    "sentry",
    "personas",
    "fabricator",
    "expositor",
    "trust_evaluation",
    "correlation_analysis",
    "distribution_analysis",
    "quality_metrics",
    "business_intelligence",
    "feature_importance",
]

ARTIFACT_STEP_MAP = {
    "final_report": "expositor",
    "enhanced_analytics": "expositor",
    "correlation_analysis": "correlation_analysis",
    "distribution_analysis": "distribution_analysis",
    "quality_metrics": "quality_metrics",
    "business_intelligence": "business_intelligence",
    "feature_importance": "feature_importance",
    "regression_insights": "regression",
    "overseer_output": "overseer",
    "personas": "personas",
    "strategies": "fabricator",
    "anomalies": "sentry",
    "dataset_identity_card": "validator",
    "task_contract": "validator",
    "trust_object": "trust_evaluation",
    "feature_governance_report": "regression",
    "baseline_metrics": "regression",
    "model_fit_report": "regression",
    "collinearity_report": "regression",
    "leakage_report": "regression",
    "importance_report": "regression",
    "regression_coefficients_report": "regression",
    "correlation_ci": "correlation_analysis",
    "data_profile": "scanner",
    "dataset_classification": "type_identifier",
    "run_health_summary": "expositor",
}

ARTIFACT_TYPE_MAP = {
    "final_report": "report",
    "enhanced_analytics": "analytics_bundle",
    "correlation_analysis": "correlation_analysis",
    "distribution_analysis": "distribution_analysis",
    "quality_metrics": "quality_metrics",
    "business_intelligence": "business_intelligence",
    "feature_importance": "feature_importance",
    "regression_insights": "regression",
    "overseer_output": "clustering",
    "personas": "personas",
    "strategies": "strategies",
    "anomalies": "anomalies",
    "dataset_identity_card": "identity_card",
    "task_contract": "task_contract",
    "trust_object": "trust_model",
    "feature_governance_report": "feature_governance",
    "baseline_metrics": "baseline_metrics",
    "model_fit_report": "model_fit",
    "collinearity_report": "collinearity",
    "leakage_report": "leakage",
    "importance_report": "importance",
    "regression_coefficients_report": "regression_coefficients",
    "correlation_ci": "correlation_ci",
    "data_profile": "data_profile",
    "dataset_classification": "dataset_classification",
    "run_health_summary": "run_health_summary",
}


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _manifest_path(run_path: str | Path) -> Path:
    return Path(run_path) / MANIFEST_NAME


def _seal_path(run_path: str | Path) -> Path:
    return Path(run_path) / MANIFEST_SEAL


def _read_manifest(run_path: str | Path) -> Optional[Dict[str, Any]]:
    path = _manifest_path(run_path)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _is_manifest_sealed(run_path: str | Path) -> bool:
    seal_path = _seal_path(run_path)
    if seal_path.exists():
        return True
    manifest = _read_manifest(run_path)
    return bool(manifest and manifest.get("sealed_at"))


def read_manifest(run_path: str | Path) -> Optional[Dict[str, Any]]:
    return _read_manifest(run_path)


def _write_manifest(run_path: str | Path, manifest: Dict[str, Any]) -> None:
    path = _manifest_path(run_path)
    tmp_path = path.with_suffix(".json.tmp")
    manifest["updated_at"] = _iso_now()
    tmp_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    tmp_path.replace(path)


def seal_manifest(run_path: str | Path, reason: str = "run_complete") -> None:
    if _is_manifest_sealed(run_path):
        return
    manifest = _read_manifest(run_path)
    if not manifest:
        return
    manifest["sealed_at"] = _iso_now()
    manifest["seal_reason"] = reason
    _write_manifest(run_path, manifest)
    _seal_path(run_path).write_text(
        json.dumps({"sealed_at": manifest["sealed_at"], "reason": reason}, indent=2),
        encoding="utf-8",
    )


def _git_commit_hash(repo_root: Path) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(repo_root), "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout.strip()[:40]
    except Exception:
        return "unknown"


def compute_dataset_fingerprint(file_hash: str, columns: Iterable[str], row_count: int) -> str:
    payload = {
        "sha256": file_hash,
        "columns": list(columns),
        "row_count": int(row_count),
    }
    encoded = json.dumps(payload, sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def initialize_manifest(
    run_path: str | Path,
    run_id: str,
    dataset_fingerprint: str,
    created_at: Optional[str] = None,
) -> Dict[str, Any]:
    repo_root = Path(run_path).resolve().parent.parent
    manifest = {
        "manifest_version": MANIFEST_VERSION,
        "run_id": run_id,
        "created_at": created_at or _iso_now(),
        "pipeline_version": PIPELINE_VERSION,
        "code_commit_hash": _git_commit_hash(repo_root),
        "dataset_fingerprint": dataset_fingerprint,
        "steps": {
            step: {
                "status": "not_started",
                "started_at": None,
                "ended_at": None,
                "error_code": None,
                "error_message": None,
            }
            for step in DEFAULT_STEPS
        },
        "artifacts": {},
        "warnings": [],
        "trust": None,
        "analysis_allowed": [],
        "analysis_suppressed": {},
        "render_policy": {
            "allow_report": False,
            "allow_regression_sections": False,
            "allow_forecasting": False,
            "allow_simulation": False,
            "allow_trust_summary": False,
            "allow_personas": False,
            "allow_strategies": False,
            "allow_anomalies": False,
            "allow_correlation_analysis": False,
            "allow_distribution_analysis": False,
            "allow_quality_metrics": False,
            "allow_business_intelligence": False,
            "allow_feature_importance": False,
        },
        "view_policies": {
            "executive": {"allowed_sections": [], "default_collapsed_sections": []},
            "analyst": {"allowed_sections": [], "default_collapsed_sections": []},
            "expert": {"allowed_sections": [], "default_collapsed_sections": []},
        },
        "updated_at": _iso_now(),
    }
    _write_manifest(run_path, manifest)
    return manifest


def update_step_status(
    run_path: str | Path,
    step: str,
    status: str,
    error_code: Optional[str] = None,
    error_message: Optional[str] = None,
) -> None:
    if _is_manifest_sealed(run_path):
        return
    manifest = _read_manifest(run_path)
    if not manifest:
        return
    steps = manifest.get("steps", {})
    entry = steps.get(step) or {
        "status": "not_started",
        "started_at": None,
        "ended_at": None,
        "error_code": None,
        "error_message": None,
    }
    if status == "running":
        entry["started_at"] = entry.get("started_at") or _iso_now()
    if status in {"success", "failed", "skipped"}:
        entry["ended_at"] = _iso_now()
    entry["status"] = status
    entry["error_code"] = error_code
    entry["error_message"] = error_message
    steps[step] = entry
    manifest["steps"] = steps
    _write_manifest(run_path, manifest)


def register_artifact(
    run_path: str | Path,
    artifact_id: str,
    artifact_type: str,
    produced_by_step: str,
    status: str,
    valid: bool,
    validation_errors: list,
    validation_warnings: list,
    input_fingerprint: str,
) -> None:
    if _is_manifest_sealed(run_path):
        return
    manifest = _read_manifest(run_path)
    if not manifest:
        return
    artifacts = manifest.get("artifacts", {})
    artifacts[artifact_id] = {
        "artifact_id": artifact_id,
        "artifact_type": artifact_type,
        "produced_by_step": produced_by_step,
        "status": status,
        "valid": bool(valid),
        "validation_errors": validation_errors,
        "validation_warnings": validation_warnings,
        "input_fingerprint": input_fingerprint,
        "created_at": _iso_now(),
    }
    manifest["artifacts"] = artifacts
    _write_manifest(run_path, manifest)


def update_render_policy(run_path: str | Path) -> None:
    if _is_manifest_sealed(run_path):
        return
    manifest = _read_manifest(run_path)
    if not manifest:
        return
    steps = manifest.get("steps", {})
    artifacts = manifest.get("artifacts", {})
    trust = manifest.get("trust") or {}

    def _step_ok(step_name: str) -> bool:
        return steps.get(step_name, {}).get("status") == "success"

    def _artifact_ok(artifact_id: str) -> bool:
        artifact = artifacts.get(artifact_id) or {}
        return artifact.get("valid") is True and artifact.get("status") == "success"

    policy = manifest.get("render_policy", {})
    analysis_allowed = set(manifest.get("analysis_allowed") or [])
    regression_required = [
        "regression_insights",
        "feature_governance_report",
        "baseline_metrics",
        "model_fit_report",
        "collinearity_report",
        "leakage_report",
        "importance_report",
    ]
    policy.update(
        {
            "allow_report": _step_ok("expositor") and _artifact_ok("final_report"),
            "allow_regression_sections": _step_ok("regression")
            and all(_artifact_ok(name) for name in regression_required)
            and ("regression" in analysis_allowed or not analysis_allowed),
            "allow_personas": _step_ok("personas") and _artifact_ok("personas"),
            "allow_strategies": _step_ok("fabricator") and _artifact_ok("strategies"),
            "allow_anomalies": _step_ok("sentry") and _artifact_ok("anomalies"),
            "allow_correlation_analysis": _step_ok("correlation_analysis") and _artifact_ok("correlation_analysis"),
            "allow_distribution_analysis": _step_ok("distribution_analysis") and _artifact_ok("distribution_analysis"),
            "allow_quality_metrics": _step_ok("quality_metrics") and _artifact_ok("quality_metrics"),
            "allow_business_intelligence": _step_ok("business_intelligence") and _artifact_ok("business_intelligence"),
            "allow_feature_importance": _step_ok("regression")
            and _artifact_ok("importance_report")
            and ("regression" in analysis_allowed or not analysis_allowed),
            "allow_trust_summary": bool(trust.get("overall_confidence") is not None),
        }
    )
    policy["allow_simulation"] = policy.get("allow_business_intelligence", False) and (
        "simulation" in analysis_allowed or not analysis_allowed
    )
    manifest["render_policy"] = policy
    _write_manifest(run_path, manifest)


def update_analysis_routing(run_path: str | Path, allowed: list[str], suppressed: dict) -> None:
    if _is_manifest_sealed(run_path):
        return
    manifest = _read_manifest(run_path)
    if not manifest:
        return
    manifest["analysis_allowed"] = list(allowed)
    manifest["analysis_suppressed"] = suppressed
    _write_manifest(run_path, manifest)


def update_view_policies(run_path: str | Path, policies: dict) -> None:
    if _is_manifest_sealed(run_path):
        return
    manifest = _read_manifest(run_path)
    if not manifest:
        return
    manifest["view_policies"] = policies
    _write_manifest(run_path, manifest)


def add_warning(
    run_path: str | Path,
    warning_code: str,
    severity: str,
    message: str,
    related_step: Optional[str] = None,
    blocking: bool = False,
) -> None:
    if _is_manifest_sealed(run_path):
        return
    manifest = _read_manifest(run_path)
    if not manifest:
        return
    warnings = manifest.get("warnings", [])
    if any(w.get("warning_code") == warning_code for w in warnings):
        return
    warnings.append(
        {
            "warning_code": warning_code,
            "severity": severity,
            "message": message,
            "related_step": related_step,
            "blocking": bool(blocking),
        }
    )
    manifest["warnings"] = warnings
    _write_manifest(run_path, manifest)


def update_trust(run_path: str | Path, trust: Optional[Dict[str, Any]]) -> None:
    if _is_manifest_sealed(run_path):
        return
    manifest = _read_manifest(run_path)
    if not manifest:
        return
    manifest["trust"] = trust
    _write_manifest(run_path, manifest)
    update_render_policy(run_path)


def remove_artifact(run_path: str | Path, artifact_id: str) -> None:
    if _is_manifest_sealed(run_path):
        return
    manifest = _read_manifest(run_path)
    if not manifest:
        return
    artifacts = manifest.get("artifacts", {})
    if artifact_id in artifacts:
        del artifacts[artifact_id]
        manifest["artifacts"] = artifacts
        _write_manifest(run_path, manifest)
        update_render_policy(run_path)


def get_artifact_step(artifact_name: str) -> Optional[str]:
    return ARTIFACT_STEP_MAP.get(artifact_name)


def get_artifact_type(artifact_name: str) -> str:
    return ARTIFACT_TYPE_MAP.get(artifact_name, artifact_name)