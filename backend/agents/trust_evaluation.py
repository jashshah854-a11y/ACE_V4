import sys
from pathlib import Path

from core.state_manager import StateManager
from core.trust_model import compute_trust_from_manifest
from core.run_manifest import _read_manifest


def main(run_path: str) -> None:
    manifest = _read_manifest(run_path)
    if not manifest:
        # Manifest may not have been initialized; build a minimal one so trust can still run
        manifest = {"steps": {}, "artifacts": {}, "warnings": [], "trust": None}
    state_manager = StateManager(run_path)
    manifest = dict(manifest)
    data_profile = state_manager.read("data_profile") or {}
    validation_report = state_manager.read("validation_report") or {}
    numeric_stats = {}
    columns = data_profile.get("columns") or {}
    cv_values = []
    high_cv = 0
    very_high_cv = 0
    high_skew = 0
    numeric_count = 0
    for meta in columns.values():
        stats = meta.get("stats") or {}
        if not stats:
            continue
        mean = stats.get("mean")
        std = stats.get("std")
        skew = stats.get("skew")
        if isinstance(mean, (int, float)) and isinstance(std, (int, float)):
            if mean == 0:
                if std > 0:
                    cv = float("inf")
                else:
                    cv = 0.0
            else:
                cv = abs(float(std) / float(mean))
            cv_values.append(cv)
            if cv >= 1.5:
                high_cv += 1
            if cv >= 3.0:
                very_high_cv += 1
        if isinstance(skew, (int, float)):
            if abs(float(skew)) >= 2.0:
                high_skew += 1
        numeric_count += 1
    if numeric_count:
        numeric_stats = {
            "avg_cv": float(sum(cv_values) / len(cv_values)) if cv_values else 0.0,
            "high_cv_ratio": float(high_cv / numeric_count),
            "very_high_cv_ratio": float(very_high_cv / numeric_count),
            "high_skew_ratio": float(high_skew / numeric_count),
        }

    manifest["_data_profile_summary"] = {
        "row_count": data_profile.get("row_count"),
        "column_count": data_profile.get("column_count"),
        "missingness_summary": data_profile.get("missingness_summary") or {},
        "constant_columns": data_profile.get("constant_columns") or [],
        "near_constant_columns": data_profile.get("near_constant_columns") or [],
        "valid": data_profile.get("valid"),
        "numeric_stats": numeric_stats,
    }
    manifest["_validation_summary"] = {
        "mode": validation_report.get("mode"),
        "confidence_label": validation_report.get("confidence_label"),
    }
    trust = compute_trust_from_manifest(manifest)
    state_manager.write("trust_object_pending", trust)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: trust_evaluation.py <run_path>")
        sys.exit(1)
    run_path = Path(sys.argv[1])
    main(str(run_path))
