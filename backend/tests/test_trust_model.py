from core.trust_model import compute_trust_from_manifest


def _base_manifest():
    return {
        "steps": {
            "validator": {"status": "success"},
            "regression": {"status": "success"},
        },
        "artifacts": {},
        "warnings": [],
    }


def test_trust_caps_leakage_risk():
    manifest = _base_manifest()
    manifest["warnings"] = [
        {"warning_code": "DATA_LEAKAGE_POSSIBLE", "severity": "warning", "message": "Leakage possible"}
    ]
    trust = compute_trust_from_manifest(manifest)
    assert trust["components"]["leakage_risk"]["status"] == "medium"
    assert trust["overall_confidence"] <= 40


def test_trust_unknown_components_reduce_overall():
    manifest = _base_manifest()
    manifest["steps"]["regression"]["status"] = "failed"
    trust = compute_trust_from_manifest(manifest)
    assert trust["components"]["model_fit"]["status"] == "unknown"
    assert trust["overall_confidence"] <= 60


def test_trust_weighted_minimum():
    manifest = _base_manifest()
    manifest["artifacts"] = {
        "quality_metrics": {"valid": True, "status": "success"},
        "dataset_identity_card": {"valid": True, "status": "success"},
        "regression_insights": {"valid": True, "status": "success"},
        "importance_report": {"valid": True, "status": "success"},
    }
    trust = compute_trust_from_manifest(manifest)
    assert trust["overall_confidence"] == 42.0
