import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from core.registry import register_model, load_registry, promote_model, latest_by_stage


def test_registry_register_promote(tmp_path, monkeypatch):
    monkeypatch.setattr("core.registry.REGISTRY_PATH", tmp_path / "registry.json")

    mid = register_model({"auc": 0.9}, stage="staging", lineage={"run_id": "r1"})
    assert mid

    reg = load_registry()
    assert reg["models"]

    assert promote_model(mid, "production")
    latest = latest_by_stage("production")
    assert latest and latest["model_id"] == mid

