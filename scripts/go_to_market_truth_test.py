"""
Go-To-Market Truth Test runner (Phase: Production Readiness & External Credibility).
Runs synchronous pipeline on provided dataset variants and summarizes manifest/trust outputs.
"""
from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd
import numpy as np

# Add backend to path for orchestrator imports
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from orchestrator import orchestrate_new_run, main_loop  # noqa: E402
from core.run_manifest import read_manifest  # noqa: E402
from core.state_manager import StateManager  # noqa: E402


DATASET_PATH = Path(r"C:\Users\jashs\Downloads\DOHMH_New_York_City_Restaurant_Inspection_Results_20251114.csv")
OUT_DIR = ROOT / "data" / "truth_test"


@dataclass
class RunSummary:
    label: str
    dataset_path: Path
    run_id: str
    run_path: Path
    status: str
    regression_status: str | None
    trust_overall: float | None
    warnings: List[Dict[str, Any]]
    render_policy: Dict[str, Any]
    steps: Dict[str, Any]


def _ensure_dataset(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")


def _make_small(df: pd.DataFrame) -> pd.DataFrame:
    return df.sample(n=min(50, len(df)), random_state=7).reset_index(drop=True)


def _make_noisy(df: pd.DataFrame) -> pd.DataFrame:
    base = df.sample(n=min(500, len(df)), random_state=11).reset_index(drop=True)
    cols = list(base.columns[:8])
    rng = np.random.default_rng(11)
    for col in cols:
        mask = rng.random(len(base)) < 0.6
        base.loc[mask, col] = np.nan
    # Inject a noisy numeric column if possible
    numeric_cols = base.select_dtypes(include=[np.number]).columns
    if len(numeric_cols) > 0:
        col = numeric_cols[0]
        base[col] = base[col] + rng.normal(0, base[col].std() or 1, size=len(base))
        outlier_mask = rng.random(len(base)) < 0.1
        base.loc[outlier_mask, col] = base.loc[outlier_mask, col] * 50
    # Add a zero-mean numeric column to surface volatility in the profile
    base["noisy_zero_mean"] = np.where(np.arange(len(base)) % 2 == 0, 1.0, -1.0)
    return base


def _make_leakage(df: pd.DataFrame) -> pd.DataFrame:
    base = df.sample(n=min(1000, len(df)), random_state=23).reset_index(drop=True)
    rng = np.random.default_rng(23)
    base["synthetic_signal"] = rng.normal(0, 1, size=len(base))
    base["synthetic_signal_copy"] = base["synthetic_signal"] * 1.0
    return base


def _write_csv(df: pd.DataFrame, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    return path


def _run_pipeline(label: str, dataset_path: Path) -> RunSummary:
    run_config = {
        "task_intent": {
            "primary_question": "Identify violation patterns and summarize actionable risk areas.",
            "decision_context": "Public health team prioritizes inspection focus areas for the next quarter.",
            "required_output_type": "diagnostic",
            "success_criteria": "Top drivers with limits, clear constraints, no causal claims.",
            "constraints": "No causal claims.",
            "confidence_threshold": 0.85,
        },
        "fast_mode": True,
    }

    run_id, run_path_str = orchestrate_new_run(str(dataset_path), run_config=run_config)
    run_path = Path(run_path_str)
    main_loop(str(run_path))

    manifest = read_manifest(run_path) or {}
    trust = manifest.get("trust") or {}
    regression_status = (manifest.get("steps", {}).get("regression") or {}).get("status")

    return RunSummary(
        label=label,
        dataset_path=dataset_path,
        run_id=run_id,
        run_path=run_path,
        status=manifest.get("status", "unknown"),
        regression_status=regression_status,
        trust_overall=trust.get("overall_confidence"),
        warnings=manifest.get("warnings") or [],
        render_policy=manifest.get("render_policy") or {},
        steps=manifest.get("steps") or {},
    )


def _summaries_to_json(summaries: List[RunSummary]) -> List[Dict[str, Any]]:
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
                "trust_overall": summary.trust_overall,
                "warning_count": len(summary.warnings),
                "warnings": summary.warnings,
                "render_policy": summary.render_policy,
                "steps": {k: v.get("status") for k, v in summary.steps.items()},
            }
        )
    return output


def main() -> None:
    _ensure_dataset(DATASET_PATH)
    df = pd.read_csv(DATASET_PATH)

    small_path = _write_csv(_make_small(df), OUT_DIR / "small_dataset.csv")
    noisy_path = _write_csv(_make_noisy(df), OUT_DIR / "noisy_dataset.csv")
    leakage_path = _write_csv(_make_leakage(df), OUT_DIR / "leakage_dataset.csv")

    runs = [
        ("cold_start", DATASET_PATH),
        ("small_data", small_path),
        ("noisy_data", noisy_path),
        ("leakage_data", leakage_path),
    ]

    summaries: List[RunSummary] = []
    for label, path in runs:
        print(f"\n=== Running {label} ===")
        summary = _run_pipeline(label, path)
        print(f"Run {summary.run_id} status={summary.status} trust={summary.trust_overall}")
        summaries.append(summary)

    output = _summaries_to_json(summaries)
    out_file = OUT_DIR / "truth_test_summary.json"
    out_file.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"\nSaved summary to {out_file}")


if __name__ == "__main__":
    main()
