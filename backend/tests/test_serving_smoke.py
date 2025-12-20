import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))


@pytest.fixture(scope="function")
def client_with_model(tmp_path, monkeypatch):
    """Fixture that sets up env, loads model, and returns TestClient."""
    import pickle
    from sklearn.linear_model import LinearRegression
    import numpy as np

    # Create model
    model_path = tmp_path / "model.pkl"
    X = np.array([[0], [1], [2], [3]])
    y = np.array([0, 1, 2, 3])
    lr = LinearRegression().fit(X, y)
    with open(model_path, "wb") as f:
        pickle.dump(lr, f)

    # Set env BEFORE importing app
    monkeypatch.setenv("ACE_MODEL_PATH", str(model_path))
    monkeypatch.setenv("ACE_SERVE_TOKEN", "secret-token")
    
    # Now import and load
    from serving.app import app, load_model
    load_model()  # Force load with correct env
    
    # Return client after model is loaded
    return TestClient(app)


def test_health_and_predict(client_with_model):
    """Test health endpoint reports model loaded and predict works."""
    client = client_with_model
    
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["model_loaded"] is True
    assert data["status"] == "ok"

    headers = {"X-API-Token": "secret-token"}
    resp2 = client.post("/predict", json={"inputs": [[4], [5]]}, headers=headers)
    assert resp2.status_code == 200
    out = resp2.json()["outputs"]
    assert len(out) == 2

