from typing import Any, List
import os
import pickle
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

app = FastAPI(title="ACE Serving", version="0.2.0")

def _get_model_path():
    return os.getenv("ACE_MODEL_PATH", "model.pkl")

def _get_token():
    return os.getenv("ACE_SERVE_TOKEN", "secret-token")

API_TOKEN = _get_token()
MODEL_PATH = _get_model_path()
auth_header = APIKeyHeader(name="X-API-Token", auto_error=False)

model = None


def load_model():
    global model
    # Refresh env on each call to allow test-time override
    mpath = Path(_get_model_path())
    token = _get_token()
    globals()["API_TOKEN"] = token
    if not mpath.exists():
        return None
    try:
        with open(mpath, "rb") as f:
            model = pickle.load(f)
    except Exception:
        model = None
    return model


def require_token(token: str = Depends(auth_header)):
    if token != API_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing token",
        )


class PredictRequest(BaseModel):
    inputs: List[Any]


class PredictResponse(BaseModel):
    outputs: List[Any]


@app.on_event("startup")
def _startup():
    load_model()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ace-serving",
        "model_loaded": model is not None,
    }


@app.post("/predict", response_model=PredictResponse, dependencies=[Depends(require_token)])
def predict(req: PredictRequest):
    if model is None:
        load_model()
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    try:
        preds = model.predict(req.inputs)
        return {"outputs": list(preds)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {e}")



