import json
import os
from pathlib import Path

import pandas as pd
import pytest

from orchestrator import orchestrate_new_run, main_loop
from core.run_manifest import read_manifest
from core.invariants import run_invariants


GOLDEN_ENV = "ACE_RUN_GOLDEN"
UPDATE_ENV = "ACE_GOLDEN_UPDATE"


@pytest.mark.skipif(os.getenv(GOLDEN_ENV) == "0", reason="Golden runs disabled (set ACE_RUN_GOLDEN=1 or unset).")
def test_golden_run_suite(tmp_path):
    fixtures_dir = Path(__file__).parent / "fixtures" / "golden"
    fixtures_dir.mkdir(parents=True, exist_ok=True)

    datasets = {
        "clean": _make_clean_dataset(tmp_path / "clean.csv"),
        "multicollinear": _make_multicollinear_dataset(tmp_path / "multicollinear.csv"),
        "leakage": _make_leakage_dataset(tmp_path / "leakage.csv"),
        "sparse": _make_sparse_dataset(tmp_path / "sparse.csv"),
    }

    for name, path in datasets.items():
        run_config = {
            "task_intent": {
                "primary_question": "Golden run invariant validation.",
                "decision_context": "Test harness.",
                "required_output_type": "predictive",
                "success_criteria": "Pipeline completes with invariants satisfied.",
                "constraints": "No causal claims.",
                "confidence_threshold": 0.5,
            },
            "target_column": "target",
            "fast_mode": True,
        }
        run_id, run_path = orchestrate_new_run(
            str(path),
            run_config=run_config,
            run_id=f"golden-{name}",
        )
        assert run_path, f"Run path not created for {name}"
        main_loop(run_path)

        manifest = read_manifest(run_path)
        assert manifest, f"Manifest missing for {name}"

        manifest = _normalize_manifest(manifest)

        invariant_result = run_invariants(manifest)
        assert invariant_result["ok"], f"Invariants failed for {name}: {invariant_result['violations']}"

        snapshot_path = fixtures_dir / f"{name}_manifest.json"
        if os.getenv(UPDATE_ENV) == "1" or not snapshot_path.exists():
            snapshot_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        else:
            expected = json.loads(snapshot_path.read_text(encoding="utf-8"))
            assert manifest == expected, f"Manifest snapshot mismatch for {name}"


def _normalize_manifest(manifest: dict) -> dict:
    manifest = json.loads(json.dumps(manifest))
    for key in ("created_at", "updated_at", "sealed_at"):
        if key in manifest:
            manifest[key] = None
    steps = manifest.get("steps", {})
    for payload in steps.values():
        if isinstance(payload, dict):
            payload["started_at"] = None
            payload["ended_at"] = None
    artifacts = manifest.get("artifacts", {})
    for payload in artifacts.values():
        if isinstance(payload, dict):
            payload["created_at"] = None
    return manifest


def _make_clean_dataset(path: Path) -> Path:
    df = pd.DataFrame(
        {
            "feature_a": [1, 2, 3, 4, 5],
            "feature_b": [2, 3, 4, 5, 6],
            "target": [10, 12, 13, 15, 16],
        }
    )
    df.to_csv(path, index=False)
    return path


def _make_multicollinear_dataset(path: Path) -> Path:
    base = pd.Series([10, 20, 30, 40, 50])
    df = pd.DataFrame(
        {
            "feature_a": base,
            "feature_b": base * 1.01,
            "feature_c": base * 0.99,
            "target": base * 2 + 5,
        }
    )
    df.to_csv(path, index=False)
    return path


def _make_leakage_dataset(path: Path) -> Path:
    target = pd.Series([100, 120, 130, 140, 160])
    df = pd.DataFrame(
        {
            "feature_a": [1, 2, 3, 4, 5],
            "leakage_feature": target * 1.0,
            "target": target,
        }
    )
    df.to_csv(path, index=False)
    return path


def _make_sparse_dataset(path: Path) -> Path:
    df = pd.DataFrame(
        {
            "feature_a": [1, None, None, 4, None],
            "feature_b": [None, None, 3, None, 5],
            "target": [1, 1, 0, 0, 1],
        }
    )
    df.to_csv(path, index=False)
    return path
