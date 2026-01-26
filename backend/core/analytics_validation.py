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


def validate_data_profile(payload: Dict[str, Any]) -> ValidationResult:
    errors: list = []
    warnings: list = []
    if not isinstance(payload, dict):
        return {"valid": False, "errors": [{"type": "ARTIFACT_INVALID", "metric": "data_profile"}], "warnings": []}
    for key in ("row_count", "column_count", "columns", "column_types"):
        if key not in payload:
            errors.append({"type": "MISSING_FIELD", "metric": key})
    row_count = payload.get("row_count")
    col_count = payload.get("column_count")
    if not isinstance(row_count, int):
        errors.append({"type": "INVALID_FIELD", "metric": "row_count", "value": row_count})
    if not isinstance(col_count, int):
        errors.append({"type": "INVALID_FIELD", "metric": "column_count", "value": col_count})
    return {"valid": not errors, "errors": errors, "warnings": warnings}


def validate_dataset_classification(payload: Dict[str, Any]) -> ValidationResult:
    errors: list = []
    warnings: list = []
    if not isinstance(payload, dict):
        return {"valid": False, "errors": [{"type": "ARTIFACT_INVALID", "metric": "dataset_classification"}], "warnings": []}
    for key in ("domain_tags", "temporal_structure", "observation_unit", "target_presence"):
        if key not in payload:
            errors.append({"type": "MISSING_FIELD", "metric": key})
    temporal = payload.get("temporal_structure") or {}
    if isinstance(temporal, dict):
        conf = temporal.get("confidence")
        if conf is not None and not (0 <= float(conf) <= 1):
            errors.append({"type": "METRIC_OUT_OF_BOUNDS", "metric": "temporal_confidence", "value": conf})
    return {"valid": not errors, "errors": errors, "warnings": warnings}


def validate_feature_governance_report(payload: Dict[str, Any]) -> ValidationResult:
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

    included = payload.get("included_features")
    excluded = payload.get("excluded_features")
    if not isinstance(included, list):
        _add_error(errors, "ARTIFACT_INVALID", "included_features", included, "list", "included_features")
    if not isinstance(excluded, list):
        _add_error(errors, "ARTIFACT_INVALID", "excluded_features", excluded, "list", "excluded_features")
    return {"valid": not errors, "errors": errors, "warnings": warnings}


def validate_baseline_metrics(payload: Dict[str, Any]) -> ValidationResult:
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

    for metric, value in payload.items():
        if metric in {"status", "valid", "errors", "warnings"}:
            continue
        if value is None:
            continue
        if not _is_number(value):
            _add_error(errors, "METRIC_NOT_NUMERIC", metric, value, "numeric", metric)
    return {"valid": not errors, "errors": errors, "warnings": warnings}


def validate_model_fit_report(payload: Dict[str, Any]) -> ValidationResult:
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

    metrics = payload.get("metrics")
    baseline = payload.get("baseline_metrics")
    if not isinstance(metrics, dict):
        _add_error(errors, "ARTIFACT_INVALID", "metrics", metrics, "dict", "metrics")
    if not isinstance(baseline, dict):
        _add_error(errors, "ARTIFACT_INVALID", "baseline_metrics", baseline, "dict", "baseline_metrics")
    if isinstance(metrics, dict):
        _validate_range(errors, "r_squared", metrics.get("r2"), 0.0, 1.0, "metrics.r2")
        if _is_number(metrics.get("r2")) and float(metrics.get("r2")) >= 0.9:
            _add_warning(warnings, "OVERFIT_RISK", "r_squared", metrics.get("r2"), "metrics.r2", "High R-squared may indicate overfitting.")
    return {"valid": not errors, "errors": errors, "warnings": _dedupe_warnings(warnings)}


def validate_collinearity_report(payload: Dict[str, Any]) -> ValidationResult:
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

    vif_by_feature = payload.get("vif_by_feature")
    max_vif = payload.get("max_vif")
    if vif_by_feature is not None and not isinstance(vif_by_feature, dict):
        _add_error(errors, "ARTIFACT_INVALID", "vif_by_feature", vif_by_feature, "dict", "vif_by_feature")
    if max_vif is not None:
        if isinstance(max_vif, bool) or not isinstance(max_vif, (int, float)) or math.isnan(float(max_vif)):
            _add_error(errors, "METRIC_NOT_NUMERIC", "max_vif", max_vif, "numeric", "max_vif")
        else:
            max_vif_value = float(max_vif)
            if math.isinf(max_vif_value):
                _add_warning(
                    warnings,
                    "CRITICAL_MULTICOLLINEARITY",
                    "max_vif",
                    max_vif,
                    "max_vif",
                    "VIF infinite indicates perfect multicollinearity.",
                )
            else:
                if max_vif_value >= 10:
                    _add_warning(warnings, "HIGH_MULTICOLLINEARITY", "max_vif", max_vif, "max_vif", "VIF >= 10 indicates multicollinearity.")
                if max_vif_value >= 20:
                    _add_warning(warnings, "CRITICAL_MULTICOLLINEARITY", "max_vif", max_vif, "max_vif", "VIF >= 20 indicates severe multicollinearity.")
    return {"valid": not errors, "errors": errors, "warnings": _dedupe_warnings(warnings)}


def validate_leakage_report(payload: Dict[str, Any]) -> ValidationResult:
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

    pairs = payload.get("flagged_pairs")
    target_pairs = payload.get("flagged_target_pairs")
    if pairs is not None and not isinstance(pairs, list):
        _add_error(errors, "ARTIFACT_INVALID", "flagged_pairs", pairs, "list", "flagged_pairs")
    if target_pairs is not None and not isinstance(target_pairs, list):
        _add_error(errors, "ARTIFACT_INVALID", "flagged_target_pairs", target_pairs, "list", "flagged_target_pairs")
    if isinstance(target_pairs, list) and target_pairs:
        _add_warning(warnings, "DATA_LEAKAGE_POSSIBLE", "target_leakage", len(target_pairs), "flagged_target_pairs", "Target leakage candidates detected.")
    return {"valid": not errors, "errors": errors, "warnings": _dedupe_warnings(warnings)}


def validate_importance_report(payload: Dict[str, Any]) -> ValidationResult:
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

    features = payload.get("features")
    if not isinstance(features, list):
        _add_error(errors, "ARTIFACT_INVALID", "features", features, "list", "features")
        return {"valid": False, "errors": errors, "warnings": warnings}
    for idx, entry in enumerate(features):
        if not isinstance(entry, dict):
            _add_error(errors, "ARTIFACT_INVALID", "features", entry, "dict", f"features[{idx}]")
            continue
        _validate_range(errors, "importance", entry.get("importance"), 0.0, 100.0, f"features[{idx}].importance")
        ci_low = entry.get("ci_low")
        ci_high = entry.get("ci_high")
        if _is_number(ci_low) and _is_number(ci_high) and float(ci_low) > float(ci_high):
            _add_error(errors, "METRIC_OUT_OF_BOUNDS", "importance_ci", (ci_low, ci_high), "ci_low <= ci_high", f"features[{idx}]")
    return {"valid": not errors, "errors": errors, "warnings": warnings}


def validate_regression_coefficients_report(payload: Dict[str, Any]) -> ValidationResult:
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

    features = payload.get("features")
    if not isinstance(features, list):
        _add_error(errors, "ARTIFACT_INVALID", "features", features, "list", "features")
        return {"valid": False, "errors": errors, "warnings": warnings}
    for idx, entry in enumerate(features):
        if not isinstance(entry, dict):
            _add_error(errors, "ARTIFACT_INVALID", "features", entry, "dict", f"features[{idx}]")
            continue
        for field in ("beta", "standard_error", "p_value", "ci_low", "ci_high"):
            if entry.get(field) is None:
                _add_error(errors, "METRIC_NOT_NUMERIC", field, entry.get(field), "numeric", f"features[{idx}].{field}")
            elif not _is_number(entry.get(field)):
                _add_error(errors, "METRIC_NOT_NUMERIC", field, entry.get(field), "numeric", f"features[{idx}].{field}")
    return {"valid": not errors, "errors": errors, "warnings": warnings}


def validate_correlation_ci(payload: Dict[str, Any]) -> ValidationResult:
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

    pairs = payload.get("pairs")
    if not isinstance(pairs, list):
        _add_error(errors, "ARTIFACT_INVALID", "pairs", pairs, "list", "pairs")
        return {"valid": False, "errors": errors, "warnings": warnings}
    for idx, entry in enumerate(pairs):
        if not isinstance(entry, dict):
            _add_error(errors, "ARTIFACT_INVALID", "pair", entry, "dict", f"pairs[{idx}]")
            continue
        _validate_range(errors, "pearson", entry.get("pearson"), -1.0, 1.0, f"pairs[{idx}].pearson")
        _validate_range(errors, "ci_low", entry.get("ci_low"), -1.0, 1.0, f"pairs[{idx}].ci_low")
        _validate_range(errors, "ci_high", entry.get("ci_high"), -1.0, 1.0, f"pairs[{idx}].ci_high")
        n = entry.get("n")
        if n is not None and (not isinstance(n, int) or n < 3):
            _add_error(errors, "METRIC_OUT_OF_BOUNDS", "n", n, ">=3", f"pairs[{idx}].n")
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
        "correlation_ci",
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
    if name == "data_profile":
        return validate_data_profile(payload)
    if name == "dataset_classification":
        return validate_dataset_classification(payload)
    if name == "run_health_summary":
        if not isinstance(payload, dict):
            return {"valid": False, "errors": [{"type": "ARTIFACT_INVALID", "metric": "run_health_summary"}], "warnings": []}
        return {"valid": True, "errors": [], "warnings": []}
    if name == "feature_governance_report":
        return validate_feature_governance_report(payload)
    if name == "baseline_metrics":
        return validate_baseline_metrics(payload)
    if name == "model_fit_report":
        return validate_model_fit_report(payload)
    if name == "collinearity_report":
        return validate_collinearity_report(payload)
    if name == "leakage_report":
        return validate_leakage_report(payload)
    if name == "importance_report":
        return validate_importance_report(payload)
    if name == "regression_coefficients_report":
        return validate_regression_coefficients_report(payload)
    if name == "correlation_ci":
        return validate_correlation_ci(payload)
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
