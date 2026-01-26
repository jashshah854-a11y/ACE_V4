import json

from core.invariants import run_invariants
from core.run_manifest import initialize_manifest


def _load_manifest(run_path):
    return json.loads((run_path / "run_manifest.json").read_text(encoding="utf-8"))


def test_invariants_flag_missing_trust_after_success(tmp_path):
    run_path = tmp_path / "inv-trust"
    run_path.mkdir()
    initialize_manifest(run_path, "inv-trust", "fingerprint", created_at="2025-01-01T00:00:00Z")
    manifest = _load_manifest(run_path)
    manifest["steps"]["trust_evaluation"]["status"] = "success"
    manifest["trust"] = None

    result = run_invariants(manifest)
    assert result["ok"] is False
    assert any(v["invariant_id"] == "trust_consistency" for v in result["violations"])


def test_invariants_flag_invalid_artifact_and_bounds(tmp_path):
    run_path = tmp_path / "inv-artifact"
    run_path.mkdir()
    initialize_manifest(run_path, "inv-artifact", "fingerprint", created_at="2025-01-01T00:00:00Z")
    manifest = _load_manifest(run_path)
    manifest["steps"]["regression"]["status"] = "success"
    manifest["artifacts"]["regression_insights"] = {
        "artifact_id": "regression_insights",
        "artifact_type": "regression",
        "produced_by_step": "regression",
        "status": "failed",
        "valid": False,
        "validation_errors": [{"type": "METRIC_OUT_OF_BOUNDS", "metric": "r_squared"}],
        "validation_warnings": [],
        "input_fingerprint": "fingerprint",
        "created_at": "2025-01-01T00:00:00Z",
    }

    result = run_invariants(manifest)
    assert result["ok"] is False
    assert any(v["invariant_id"] == "artifact_valid" for v in result["violations"])
    assert any(v["invariant_id"] == "metric_bounds" for v in result["violations"])


def test_invariants_flag_render_policy_mismatch(tmp_path):
    run_path = tmp_path / "inv-render"
    run_path.mkdir()
    initialize_manifest(run_path, "inv-render", "fingerprint", created_at="2025-01-01T00:00:00Z")
    manifest = _load_manifest(run_path)
    manifest["steps"]["expositor"]["status"] = "success"
    manifest["render_policy"]["allow_report"] = True

    result = run_invariants(manifest)
    assert result["ok"] is False
    assert any(v["invariant_id"] == "render_policy_consistency" for v in result["violations"])
