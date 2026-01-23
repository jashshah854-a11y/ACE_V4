import json

from core.run_manifest import (
    ARTIFACT_STEP_MAP,
    DEFAULT_STEPS,
    initialize_manifest,
    register_artifact,
    update_render_policy,
    update_step_status,
)


def _load_manifest(run_path):
    return json.loads((run_path / "run_manifest.json").read_text(encoding="utf-8"))


def test_manifest_steps_cover_artifact_sources():
    missing = sorted({step for step in ARTIFACT_STEP_MAP.values() if step not in DEFAULT_STEPS})
    assert not missing, f"Manifest steps missing for artifacts: {missing}"


def test_render_policy_requires_successful_steps_and_valid_artifacts(tmp_path):
    run_path = tmp_path / "contract-run"
    run_path.mkdir()
    initialize_manifest(run_path, "contract-run", "fingerprint", created_at="2025-01-01T00:00:00Z")

    update_step_status(run_path, "regression", "failed", error_code="TEST", error_message="boom")
    register_artifact(
        run_path,
        "regression_insights",
        "regression",
        "regression",
        "success",
        True,
        [],
        [],
        "fingerprint",
    )
    update_render_policy(run_path)
    manifest = _load_manifest(run_path)
    assert manifest["render_policy"]["allow_regression_sections"] is False

    update_step_status(run_path, "correlation_analysis", "success")
    register_artifact(
        run_path,
        "correlation_analysis",
        "correlation_analysis",
        "correlation_analysis",
        "failed",
        False,
        [{"type": "ARTIFACT_INVALID"}],
        [],
        "fingerprint",
    )
    update_render_policy(run_path)
    manifest = _load_manifest(run_path)
    assert manifest["render_policy"]["allow_correlation_analysis"] is False

