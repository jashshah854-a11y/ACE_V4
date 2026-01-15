import json
from pathlib import Path

from api.server import _store_enhanced_analytics_fallback

def test_store_enhanced_analytics_fallback(tmp_path):
    run_path = tmp_path / "123"
    run_path.mkdir()

    _store_enhanced_analytics_fallback(run_path, mode="unit_test")

    artifact_path = run_path / "enhanced_analytics.json"
    assert artifact_path.exists(), "Fallback analytics file should exist"

    payload = json.loads(artifact_path.read_text())
    assert payload["fallback_mode"] == "unit_test"
    assert payload["quality_metrics"]["available"] is False
    assert payload["business_intelligence"]["available"] is False
