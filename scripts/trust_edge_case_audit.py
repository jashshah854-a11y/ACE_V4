"""
Trust model edge case audit runner.
Creates synthetic datasets to exercise leakage, multicollinearity, no-target, and descriptive-only paths.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]

import sys
sys.path.insert(0, str(ROOT / "backend"))

from orchestrator import orchestrate_new_run, main_loop  # noqa: E402
from core.run_manifest import read_manifest  # noqa: E402


OUT_DIR = ROOT / "data" / "trust_edge_cases"


@dataclass
class EdgeCaseSummary:
    label: str
    dataset_path: Path
    run_id: str
    run_path: Path
    status: str
    regression_status: str | None
    trust: Dict[str, Any]
    warnings: List[Dict[str, Any]]
    render_policy: Dict[str, Any]


def _write_csv(df: pd.DataFrame, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    return path


def _make_perfect_leakage(n: int = 200) -> pd.DataFrame:
    rng = np.random.default_rng(5)
    base = rng.normal(50, 8, size=n)
    target = base * 2.0
    return pd.DataFrame(
        {
            "user_id": np.arange(1, n + 1),
            "feature_a": base,
            "revenue": target + 10.0,
            "leakage_feature": target,
            "target": target,
        }
    )


def _make_multicollinear_fit(n: int = 300) -> pd.DataFrame:
    rng = np.random.default_rng(7)
    base = rng.normal(100, 10, size=n)
    noise = rng.normal(0, 1.5, size=n)
    return pd.DataFrame(
        {
            "user_id": np.arange(1, n + 1),
            "feature_a": base,
            "feature_b": base * 1.01 + rng.normal(0, 0.2, size=n),
            "feature_c": base * 0.99 + rng.normal(0, 0.2, size=n),
            "revenue": base * 3.0 + rng.normal(0, 2.0, size=n),
            "target": base * 3.0 + noise,
        }
    )


def _make_high_quality_no_target(n: int = 250) -> pd.DataFrame:
    rng = np.random.default_rng(11)
    return pd.DataFrame(
        {
            "user_id": np.arange(1, n + 1),
            "feature_a": rng.normal(50, 5, size=n),
            "feature_b": rng.normal(0, 1, size=n),
            "feature_c": rng.normal(100, 10, size=n),
            "revenue": rng.normal(120, 8, size=n),
            "target": np.ones(n),  # constant target -> invalid for regression
        }
    )


def _make_descriptive_only(n: int = 180) -> pd.DataFrame:
    rng = np.random.default_rng(23)
    return pd.DataFrame(
        {
            "user_id": np.arange(1, n + 1),
            "feature_a": rng.normal(10, 2, size=n),
            "feature_b": rng.normal(20, 3, size=n),
            "feature_c": rng.normal(30, 4, size=n),
            "revenue": rng.normal(40, 5, size=n),
        }
    )


def _run_case(
    label: str,
    dataset_path: Path,
    required_output_type: str,
    target_column: str | None = None,
) -> EdgeCaseSummary:
    run_config = {
        "task_intent": {
            "primary_question": "Audit trust model edge behavior.",
            "decision_context": "Internal validation of trust caps and suppression.",
            "required_output_type": required_output_type,
            "success_criteria": "Trust drops when risk signals are present.",
            "constraints": "No causal claims.",
            "confidence_threshold": 0.5,
            "forbidden_claims": ["no_revenue_inference"],
        },
        "fast_mode": True,
    }
    if target_column:
        run_config["target_column"] = target_column
    run_id, run_path_str = orchestrate_new_run(str(dataset_path), run_config=run_config)
    run_path = Path(run_path_str)
    main_loop(str(run_path))

    manifest = read_manifest(run_path) or {}
    trust = manifest.get("trust") or {}
    regression_status = (manifest.get("steps", {}).get("regression") or {}).get("status")

    return EdgeCaseSummary(
        label=label,
        dataset_path=dataset_path,
        run_id=run_id,
        run_path=run_path,
        status=manifest.get("status", "unknown"),
        regression_status=regression_status,
        trust=trust,
        warnings=manifest.get("warnings") or [],
        render_policy=manifest.get("render_policy") or {},
    )


def main() -> None:
    cases = [
        ("perfect_leakage", _make_perfect_leakage(), "predictive", "target"),
        ("multicollinear_fit", _make_multicollinear_fit(), "predictive", "target"),
        ("high_quality_no_target", _make_high_quality_no_target(), "predictive", "target"),
        ("descriptive_only", _make_descriptive_only(), "descriptive", None),
    ]

    summaries: List[EdgeCaseSummary] = []
    for label, df, output_type, target_column in cases:
        path = _write_csv(df, OUT_DIR / f"{label}.csv")
        summary = _run_case(label, path, output_type, target_column)
        summaries.append(summary)
        print(
            f"{label}: run={summary.run_id} status={summary.status} "
            f"regression={summary.regression_status} trust={summary.trust.get('overall_confidence')}"
        )

    output = []
    for summary in summaries:
        output.append(
            {
                "label": summary.label,
                "dataset": str(summary.dataset_path),
                "run_id": summary.run_id,
                "run_path": str(summary.run_path),
                "status": summary.status,
                "regression_status": summary.regression_status,
                "trust": summary.trust,
                "warning_count": len(summary.warnings),
                "warnings": summary.warnings,
                "render_policy": summary.render_policy,
            }
        )
    out_file = OUT_DIR / "edge_case_summary.json"
    out_file.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Saved summary to {out_file}")


if __name__ == "__main__":
    main()
