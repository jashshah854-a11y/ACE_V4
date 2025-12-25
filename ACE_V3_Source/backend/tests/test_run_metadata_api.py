import json
import pytest

try:
    from api import server
except ModuleNotFoundError:
    pytest.skip('API dependencies missing', allow_module_level=True)

from fastapi.testclient import TestClient



def test_run_state_includes_source(monkeypatch, tmp_path):
    original_data_dir = server.DATA_DIR
    try:
        server.DATA_DIR = tmp_path
        run_id = 'abc12345'
        run_dir = tmp_path / 'runs' / run_id
        run_dir.mkdir(parents=True)
        state = {'run_id': run_id, 'created_at': '2025-01-01T00:00:00Z'}
        (run_dir / 'orchestrator_state.json').write_text(json.dumps(state))
        (run_dir / 'source_metadata.json').write_text(json.dumps({'connector': 'local_file', 'path': 'file.csv'}))

        client = TestClient(server.app)
        response = client.get(f'/runs/{run_id}/state')
        assert response.status_code == 200
        payload = response.json()
        assert payload['source']['connector'] == 'local_file'
    finally:
        server.DATA_DIR = original_data_dir


def test_runs_endpoint_includes_details(monkeypatch, tmp_path):
    original_data_dir = server.DATA_DIR
    try:
        server.DATA_DIR = tmp_path
        runs_dir = tmp_path / 'runs'
        runs_dir.mkdir(parents=True, exist_ok=True)
        run_id = 'run1abcd'
        run_path = runs_dir / run_id
        run_path.mkdir()
        (run_path / 'orchestrator_state.json').write_text(json.dumps({'run_id': run_id, 'created_at': '2025-01-02T00:00:00Z', 'status': 'completed'}))
        (run_path / 'source_metadata.json').write_text(json.dumps({'connector': 'hook'}))

        client = TestClient(server.app)
        resp = client.get('/runs')
        assert resp.status_code == 200
        data = resp.json()
        assert 'run_details' in data
        detail = next(d for d in data['run_details'] if d['run_id'] == run_id)
        assert detail['source']['connector'] == 'hook'
    finally:
        server.DATA_DIR = original_data_dir
