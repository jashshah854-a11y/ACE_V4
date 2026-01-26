from __future__ import annotations

from typing import Any, Dict, List


def build_run_health_summary(manifest: Dict[str, Any]) -> Dict[str, Any]:
    steps = manifest.get("steps") or {}
    artifacts = manifest.get("artifacts") or {}
    warnings = manifest.get("warnings") or []
    trust = manifest.get("trust") or {}
    render_policy = manifest.get("render_policy") or {}
    analysis_suppressed = manifest.get("analysis_suppressed") or {}

    steps_failed = [name for name, meta in steps.items() if meta.get("status") == "failed"]
    artifacts_invalid = [
        name for name, meta in artifacts.items() if not (meta.get("valid") is True and meta.get("status") == "success")
    ]

    warnings_by_severity: Dict[str, int] = {}
    for warning in warnings:
        severity = warning.get("severity") or "unknown"
        warnings_by_severity[severity] = warnings_by_severity.get(severity, 0) + 1

    blocked_sections = [key for key, value in render_policy.items() if key.startswith("allow_") and not value]

    return {
        "steps_failed": steps_failed,
        "artifacts_invalid": artifacts_invalid,
        "warnings_by_severity": warnings_by_severity,
        "trust_score": trust.get("overall_confidence"),
        "blocked_sections": blocked_sections,
        "analysis_suppressed": analysis_suppressed,
        "status": "success",
        "valid": True,
    }
