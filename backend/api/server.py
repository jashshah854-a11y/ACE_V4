from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import sys
import json
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

# Fix for joblib warning on Windows
if os.name == 'nt':
    os.environ["LOKY_MAX_CPU_COUNT"] = str(os.cpu_count())

from orchestrator import launch_pipeline_async
from core.state_manager import StateManager

app = FastAPI(
    title="ACE V3 Intelligence API",
    description="Universal Autonomous Cognitive Entity Engine API",
    version="3.0.0"
)

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your Lovable domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure data directory exists
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
RUNS_DIR = DATA_DIR / "runs"
RUNS_DIR.mkdir(exist_ok=True)


def _resolve_run_path(run_id: str) -> Path:
    if not run_id:
        raise HTTPException(status_code=400, detail="run_id is required")
    if any(sep in run_id for sep in ("/", "\\")):
        raise HTTPException(status_code=400, detail="Invalid run_id")
    if not all(c.isalnum() or c in ('-', '_') for c in run_id):
        raise HTTPException(status_code=400, detail="Invalid run_id")
    root = RUNS_DIR.resolve()
    run_path = (root / run_id).resolve()
    if not str(run_path).startswith(str(root)):
        raise HTTPException(status_code=400, detail="Invalid run_id")
    return run_path

def _safe_upload_path(original_name: str) -> Path:
    """Return a unique, sanitized destination for an uploaded file."""
    name = Path(original_name or "uploaded")
    suffix = "".join(name.suffixes) or ".csv"
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    return DATA_DIR / safe_name




def _parse_bool(value: Optional[str]) -> Optional[bool]:
    if value is None:
        return None
    lowered = value.strip().lower()
    if lowered in {"1", "true", "yes", "on"}:
        return True
    if lowered in {"0", "false", "no", "off"}:
        return False
    return None



def _parse_feature_list(value: Optional[str]) -> Optional[list]:
    if not value:
        return None
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(item) for item in parsed if isinstance(item, (str, int, float))]
    except json.JSONDecodeError:
        pass
    parts = [segment.strip() for segment in value.split(',') if segment.strip()]
    return parts or None



def _build_run_config(*, target_column, feature_whitelist, model_type, include_categoricals, fast_mode) -> Optional[Dict[str, Any]]:
    config: Dict[str, Any] = {}
    if target_column:
        config["target_column"] = target_column.strip()

    parsed_features = _parse_feature_list(feature_whitelist)
    if parsed_features:
        config["feature_whitelist"] = parsed_features

    if model_type:
        config["model_type"] = model_type.strip().lower()

    cat_choice = _parse_bool(include_categoricals)
    if cat_choice is not None:
        config["include_categoricals"] = cat_choice

    fast_choice = _parse_bool(fast_mode)
    if fast_choice is not None:
        config["fast_mode"] = fast_choice

    return config or None




def _safe_upload_path(original_name: str) -> Path:
    """Return a unique, sanitized destination for an uploaded file."""
    name = Path(original_name or "uploaded")
    suffix = "".join(name.suffixes) or ".csv"
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    return DATA_DIR / safe_name


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")

class RunResponse(BaseModel):
    run_id: str
    message: str
    status: str

@app.post("/run", response_model=RunResponse, tags=["Execution"])
async def trigger_run(
    file: UploadFile = File(...),
    target_column: Optional[str] = Form(None),
    feature_whitelist: Optional[str] = Form(None),
    model_type: Optional[str] = Form(None),
    include_categoricals: Optional[str] = Form(None),
    fast_mode: Optional[str] = Form(None),
):
    """
    Upload a CSV file and trigger a full ACE V3 run.
    Returns the Run ID.
    """
    file_path = _safe_upload_path(file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        run_config = _build_run_config(
            target_column=target_column,
            feature_whitelist=feature_whitelist,
            model_type=model_type,
            include_categoricals=include_categoricals,
            fast_mode=fast_mode,
        )

        run_id, run_path = launch_pipeline_async(str(file_path), run_config=run_config)
        if not run_path:
            raise HTTPException(status_code=500, detail="ACE could not start the run.")
        
        return {
            "run_id": run_id,
            "message": "ACE V3 run accepted. Poll status endpoint for updates.",
            "status": "accepted"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ACE Execution Failed: {str(e)}")

@app.get("/runs/{run_id}/report", tags=["Artifacts"])
async def get_report(run_id: str):
    """Get the final markdown report for a specific run."""
    run_path = _resolve_run_path(run_id)
    report_path = run_path / "final_report.md"
    
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")
        
    return FileResponse(report_path)

@app.get("/runs/{run_id}/artifacts/{artifact_name}", tags=["Artifacts"])
async def get_artifact(run_id: str, artifact_name: str):
    """Get a specific JSON artifact (e.g., overseer_output, personas, strategies)."""
    run_path = _resolve_run_path(run_id)
    state = StateManager(str(run_path))
    
    data = state.read(artifact_name)
    if not data:
        raise HTTPException(status_code=404, detail=f"Artifact '{artifact_name}' not found")
        
    return data


@app.get("/runs/{run_id}/state", tags=["History"])
async def get_run_state(run_id: str):
    """Return orchestrator state for a run."""
    run_path = _resolve_run_path(run_id)
    state_path = run_path / "orchestrator_state.json"

    if not state_path.exists():
        raise HTTPException(status_code=404, detail="State not found")

    with open(state_path, "r", encoding="utf-8") as f:
        state = json.load(f)
    return state

@app.get("/runs", tags=["History"])
async def list_runs():
    """List all available runs."""
    runs_dir = DATA_DIR / "runs"
    if not runs_dir.exists():
        return []
        
    runs = []
    for run_folder in runs_dir.iterdir():
        if run_folder.is_dir():
            runs.append(run_folder.name)
    return sorted(runs, reverse=True)

if __name__ == "__main__":
    import uvicorn
    # Use string reference for reload to work properly
    uvicorn.run("api.server:app", host="0.0.0.0", port=8000, reload=True)
