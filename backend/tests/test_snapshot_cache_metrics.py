import json

from fastapi.testclient import TestClient

import backend.api.server as server


def test_snapshot_cache_metrics(monkeypatch, tmp_path):
    # Disable startup side effects (redis init + prewarm)
    async def _noop_init():
        return None

    monkeypatch.setattr(server, "_initialize_app", _noop_init)

    # Point DATA_DIR to temp path
    data_dir = tmp_path / "data"
    runs_dir = data_dir / "runs"
    run_id = "deadbeef"
    run_path = runs_dir / run_id
    run_path.mkdir(parents=True, exist_ok=True)

    # Minimal required files
    (run_path / "run_manifest.json").write_text(
        json.dumps({"run_id": run_id, "render_policy": {}, "view_policies": {}, "trust": {}, "warnings": []}),
        encoding="utf-8",
    )
    (run_path / "validation_report.json").write_text(json.dumps({"mode": "strict", "target_column": "a"}), encoding="utf-8")
    (run_path / "confidence_report.json").write_text(json.dumps({"confidence_label": "high"}), encoding="utf-8")
    (run_path / "dataset_identity_card.json").write_text(
        json.dumps(
            {
                "row_count": 10,
                "column_count": 2,
                "quality": {"avg_null_pct": 0.1},
                "columns": {"a": {"dtype": "int"}, "b": {"dtype": "float"}},
            }
        ),
        encoding="utf-8",
    )

    monkeypatch.setattr(server, "DATA_DIR", data_dir)
    server.snapshot_redis = None
    server.snapshot_metrics = {"redis_hit": 0, "memory_hit": 0, "miss": 0}
    server.snapshot_cache._store = {}

    with TestClient(server.app) as client:
        r1 = client.get(f"/run/{run_id}/snapshot?lite=true")
        assert r1.status_code == 200
        r2 = client.get(f"/run/{run_id}/snapshot?lite=true")
        assert r2.status_code == 200
        debug = client.get("/debug/snapshot-cache")
        assert debug.status_code == 200
        metrics = debug.json().get("metrics") or {}

    # First request should be a miss, second should hit cache (memory or redis)
    assert metrics.get("miss") == 1
    assert metrics.get("memory_hit", 0) + metrics.get("redis_hit", 0) >= 1
