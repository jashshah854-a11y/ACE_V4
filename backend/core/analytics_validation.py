from __future__ import annotations

import math
from typing import Any, Dict, Iterable, List, Tuple

ValidationResult = Dict[str, Any]


def _is_number(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    if not isinstance(value, (int, float)):
        return False
    return math.isfinite(float(value))


def _add_error(
    errors: List[Dict[str, Any]],
    code: str,
    metric: str,
    value: Any,
    allowed_range: str,
    path: str | None,
) -> None:
    errors.append(
        {
            "type": code,
            "metric": metric,
            "value": value,
            "allowed_range": allowed_range,
            "path": path,
        }
    )


def _add_warning(
    warnings: List[Dict[str, Any]],
    code: str,
    metric: str,
    value: Any,
    path: str | None,
    note: str,
) -> None:
    warnings.append(
        {
            "type": code,
            "metric": metric,
            "value": value,
            "path": path,
            "note": note,
        }
    )


def _validate_range(
    errors: List[Dict[str, Any]],
    metric: str,
    value: Any,
    minimum: float,
    maximum: float,
    path: str | None,
) -> bool:
    if value is None:
        return True
    if not _is_number(value):
        _add_error(errors, "METRIC_NOT_NUMERIC", metric, value, f"{minimum} to {maximum}", path)
        return False
    numeric = float(value)
    if numeric < minimum or numeric > maximum:
        _add_error(errors, "METRIC_OUT_OF_BOUNDS", metric, numeric, f"{minimum} to {maximum}", path)
        return False
    return True


def _collect_values(payload: Any, keys: Iterable[str]) -> List[Tuple[str, Any]]:
    matches: List[Tuple[str, Any]] = []

    def walk(node: Any, path: str) -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                next_path = f"{path}.{key}" if path else key
                if key in keys:
                    matches.append((next_path, value))
                walk(value, next_path)
        elif isinstance(node, list):
            for idx, item in enumerate(node):
                walk(item, f"{path}[{idx}]")

    walk(payload, "")
    return matches


def _dedupe_warnings(warnings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    unique: List[Dict[str, Any]] = []
    for warning in warnings:
        key = (
            warning.get("type"),
            warning.get("metric"),
            warning.get("path"),
            warning.get("value"),
        )
        if key in seen:
            continue
        seen.add(key)
        unique.append(warning)
    return unique


def _iter_matrix_values(matrix: Any, name: str) -> Iterable[Tuple[str, Any]]:
    if not isinstance(matrix, dict):
        return []
    for row, cols in matrix.items():
        if not isinstance(cols, dict):
            yield (f"{name}.{row}", cols)
            continue
        for col, value in cols.items():
            yield (f"{name}.{row}.{col}", value)


def validate_correlation_analysis(payload: Dict[str, Any]) -> ValidationResult:
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

    pearson = payload.get("pearson_matrix")
    spearman = payload.get("spearman_matrix")

    for path, value in _iter_matrix_values(pearson, "pearson_matrix"):
        _validate_range(errors, "pearson", value, -1.0, 1.0, path)
    for path, value in _iter_matrix_values(spearman, "spearman_matrix"):
        _validate_range(errors, "spearman", value, -1.0, 1.0, path)

    for idx, entry in enumerate(payload.get("strong_correlations") or []):
        if not isinstance(entry, dict):
            _add_error(errors, "METRIC_NOT_NUMERIC", "correlation", entry, "-1 to 1", f"strong_correlations[{idx}]")
            continue
        pearson_val = entry.get("pearson")
        spearman_val = entry.get("spearman")
        _validate_range(errors, "pearson", pearson_val, -1.0, 1.0, f"strong_correlations[{idx}].pearson")
        _validate_range(errors, "spearman", spearman_val, -1.0, 1.0, f"strong_correlations[{idx}].spearman")
        if _is_number(pearson_val) or _is_number(spearman_val):
            max_corr = max(abs(float(pearson_val or 0)), abs(float(spearman_val or 0)))
            if max_corr >= 0.995:
                _add_warning(
                    warnings,
                    "DATA_LEAKAGE_POSSIBLE",
                    "correlation",
                    max_corr,
                    f"strong_correlations[{idx}]",
                    "Near-perfect correlation detected; potential leakage.",
                )

    return {"valid": not errors, "errors": errors, "warnings": _dedupe_warnings(warnings)}


def validate_feature_importance(payload: Dict[str, Any]) -> ValidationResult:
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

    if "confidence" in payload:
        _validate_confidence_field(payload, "confidence", errors)
    return {"valid": not errors, "errors": errors, "warnings": warnings}


def _validate_confidence_field(payload: Dict[str, Any], field: str, errors: List[Dict[str, Any]]) -> None:
    value = payload.get(field)
    meaning = payload.get("confidence_meaning")
    if not _validate_range(errors, field, value, 0.0, 100.0, field):
        return
    if not isinstance(meaning, str) or not meaning.strip():
        _add_error(errors, "CONFIDENCE_MEANING_MISSING", field, value, "meaning_required", "confidence_meaning")


def validate_regression_insights(payload: Dict[str, Any]) -> ValidationResult:
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

    metrics = payload.get("metrics") or {}
    if isinstance(metrics, dict):
        _validate_range(errors, "r_squared", metrics.get("r2"), 0.0, 1.0, "metrics.r2")
        _validate_range(errors, "adjusted_r_squared", metrics.get("adjusted_r2"), 0.0, 1.0, "metrics.adjusted_r2")
        if _is_number(metrics.get("r2")) and float(metrics.get("r2")) >= 0.9:
            _add_warning(
                warnings,
                "OVERFIT_RISK",
                "r_squared",
                float(metrics.get("r2")),
                "metrics.r2",
                "High R-squared may indicate overfitting.",
            )

    for path, value in _collect_values(
        payload,
        {"variance_explained", "variance_explained_pct", "variance_explained_percent"},
    ):
        _validate_range(errors, "variance_explained", value, 0.0, 100.0, path)

    for field in ("confidence_score", "confidence", "confidence_pct", "confidence_percentage"):
        if field in payload:
            _validate_confidence_field(payload, field, errors)

    return {"valid": not errors, "errors": errors, "warnings": _dedupe_warnings(warnings)}


def validate_enhanced_analytics(payload: Dict[str, Any]) -> ValidationResult:
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

    if not isinstance(payload, dict):
        _add_error(errors, "ARTIFACT_INVALID", "enhanced_analytics", payload, "dict", None)
        return {"valid": False, "errors": errors, "warnings": warnings}

    for section_name in (
        "correlation_analysis",
        "distribution_analysis",
        "quality_metrics",
        "business_intelligence",
        "feature_importance",
    ):
        if section_name not in payload:
            continue
        section = payload.get(section_name)
        if section is None:
            continue
        if not isinstance(section, dict):
            _add_error(errors, "ARTIFACT_INVALID", section_name, section, "dict", section_name)
            continue
        if section.get("valid") is not True or section.get("status") != "success":
            _add_error(errors, "ARTIFACT_INVALID", section_name, section, "valid_success", section_name)

    return {"valid": not errors, "errors": errors, "warnings": warnings}


def validate_artifact(name: str, payload: Dict[str, Any]) -> ValidationResult:
    if name == "regression_insights":
        return validate_regression_insights(payload)
    if name == "enhanced_analytics":
        return validate_enhanced_analytics(payload)
    if name == "correlation_analysis":
        return validate_correlation_analysis(payload)
    if name == "feature_importance":
        return validate_feature_importance(payload)
    return {"valid": True, "errors": [], "warnings": []}


def apply_artifact_validation(name: str, payload: Dict[str, Any]) -> Dict[str, Any] | None:
    validation = validate_artifact(name, payload)
    if not validation["valid"]:
        return None
    normalized = dict(payload)
    normalized["valid"] = True
    normalized["errors"] = []
    normalized["warnings"] = validation["warnings"]
    normalized.setdefault("status", "success")
    return normalized
