from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
import os

app = FastAPI(title="ACE Serving Fallback", version="0.1.0")

API_TOKEN = os.getenv("ACE_SERVE_TOKEN", "secret-token")
auth_header = APIKeyHeader(name="X-API-Token", auto_error=False)


def require_token(token: str = Depends(auth_header)):
    if token != API_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing token",
        )


class PredictRequest(BaseModel):
    inputs: list


class PredictResponse(BaseModel):
    outputs: list


@app.get("/health")
def health():
    return {"status": "ok", "service": "ace-serving"}


@app.post("/predict", response_model=PredictResponse, dependencies=[Depends(require_token)])
def predict(req: PredictRequest):
    # Placeholder echo server; replace with real model inference
    return {"outputs": req.inputs}



