import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from orchestrator import orchestrate_new_run, main_loop
from core.state_manager import StateManager
from core.schema import ensure_schema_map
from agents.expositor import Expositor


def _assert_in_range(value, minimum, maximum, label):
    if value is None:
        return
    if not isinstance(value, (int, float)):
        return
    assert minimum <= value <= maximum, f"{label} out of range: {value} not in [{minimum}, {maximum}]"


def _collect_matching_values(payload, key_names):
    matches = []

    def walk(node):
        if isinstance(node, dict):
            for key, value in node.items():
                if key in key_names:
                    matches.append(value)
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(payload)
    return matches


def test_phase0_smoke():
    repo_root = Path(__file__).resolve().parents[2]
    dataset_path = repo_root / "test_dataset.csv"
    assert dataset_path.exists(), f"Missing dataset: {dataset_path}"

    run_config = {
        "task_intent": {
            "primary_question": "Validate Phase 0 regression guardrails",
            "confidence_threshold": 80,
            "required_output_type": "descriptive",
        },
        "fast_mode": True,
    }

    run_id, run_path = orchestrate_new_run(str(dataset_path), run_config=run_config)
    assert run_path

    try:
        main_loop(run_path)
        state = StateManager(run_path)

        regression = state.read("regression_insights") or {}
        metrics = regression.get("metrics", {}) or {}
        _assert_in_range(metrics.get("r2"), 0.0, 1.0, "r2")
        _assert_in_range(metrics.get("adjusted_r2"), 0.0, 1.0, "adjusted_r2")

        enhanced = state.read("enhanced_analytics") or {}
        for section_name in (
            "correlation_analysis",
            "distribution_analysis",
            "quality_metrics",
            "business_intelligence",
            "feature_importance",
        ):
            section = enhanced.get(section_name)
            if isinstance(section, dict):
                assert section.get("valid") is True
                assert section.get("status") == "success"
        correlation = enhanced.get("correlation_analysis") or {}
        for rel in correlation.get("strong_correlations", []) or []:
            _assert_in_range(rel.get("pearson"), -1.0, 1.0, "pearson")
            _assert_in_range(rel.get("spearman"), -1.0, 1.0, "spearman")

        variance_keys = {
            "variance_explained",
            "variance_explained_pct",
            "variance_explained_percent",
        }
        for value in _collect_matching_values({"regression": regression, "enhanced": enhanced}, variance_keys):
            _assert_in_range(value, 0.0, 100.0, "variance_explained")

        regression_status = state.read("regression_status") or "not_started"
        if regression_status == "success":
            assert state.exists("regression_insights")
            assert regression.get("valid") is True
        else:
            assert not state.exists("regression_insights")

        existing_regression = state.read("regression_insights")
        invalid_regression = {
            "status": "success",
            "metrics": {"r2": 2.734},
        }
        state.write("regression_insights", invalid_regression)
        assert state.read("regression_insights") == existing_regression

        existing_enhanced = state.read("enhanced_analytics")
        invalid_enhanced = {
            "quality_metrics": {"available": False},
        }
        state.write("enhanced_analytics", invalid_enhanced)
        assert state.read("enhanced_analytics") == existing_enhanced

        state.delete("regression_insights")
        state.write("regression_status", "failed")
        schema_map = ensure_schema_map(state.read("schema_map"))
        Expositor(schema_map=schema_map, state=state).run()

        report_text = state.read("final_report") or ""
        assert "## Outcome Modeling" not in report_text
        assert "## Predictive Feature Importance" not in report_text
        assert "certified" not in report_text.lower()
    finally:
        shutil.rmtree(run_path, ignore_errors=True)
