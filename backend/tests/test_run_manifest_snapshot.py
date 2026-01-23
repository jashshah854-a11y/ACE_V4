import json
from pathlib import Path

from core.run_manifest import initialize_manifest


def test_run_manifest_snapshot(tmp_path):
    run_path = tmp_path / "snapshot-run"
    run_path.mkdir()
    initialize_manifest(run_path, "snapshot-run", "snapshot-fingerprint", created_at="2025-01-01T00:00:00Z")

    manifest = json.loads((run_path / "run_manifest.json").read_text(encoding="utf-8"))
    manifest["updated_at"] = "REDACTED"
    manifest["code_commit_hash"] = "REDACTED"

    fixture_path = Path(__file__).parent / "fixtures" / "run_manifest_snapshot.json"
    expected = json.loads(fixture_path.read_text(encoding="utf-8"))

    assert manifest == expected
