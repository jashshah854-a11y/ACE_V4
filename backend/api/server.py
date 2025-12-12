from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import sys
import json
import uuid
from pathlib import Path

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

from fastapi.staticfiles import StaticFiles

# Mount static files (Frontend)
# We expect the 'dist' folder to be at the project root level (parent of backend)
# or copied into backend. Let's assume standard Vite build at project root 'dist'.
# In the container, we'll ensure CWD allows finding 'dist' or 'backend/dist'.
# For this repo structure: root/dist
project_root = Path(__file__).parent.parent.parent
dist_dir = project_root / "dist"

# Ensure dist exists (might not locally without build)
if dist_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="assets")

# SPA Catch-all (must be last) - handled via exception handler or specific route?
# Common pattern: Serve index.html for 404s on non-api routes
@app.exception_handler(404)
async def spa_fallback(request, exc):
    # If API and not found -> return 404
    if request.url.path.startswith("/run") or request.url.path.startswith("/docs") or request.url.path.startswith("/openapi"):
         return JSONResponse({"detail": "Not Found"}, status_code=404)
    
    # Otherwise, return index.html
    if dist_dir.exists():
        return FileResponse(dist_dir / "index.html")
    return JSONResponse({"detail": "Frontend not built"}, status_code=404)

# Ensure data directory exists
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)


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
    run_path: str
    message: str
    status: str

@app.post("/run", response_model=RunResponse, tags=["Execution"])
async def trigger_run(file: UploadFile = File(...)):
    """
    Upload a CSV file and trigger a full ACE V3 run.
    Returns the Run ID.
    """
    file_path = _safe_upload_path(file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        run_id, run_path = launch_pipeline_async(str(file_path))
        if not run_path:
            raise HTTPException(status_code=500, detail="ACE could not start the run.")
        
        return {
            "run_id": run_id,
            "run_path": run_path,
            "message": "ACE V3 run accepted. Poll status endpoint for updates.",
            "status": "accepted"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ACE Execution Failed: {str(e)}")

@app.get("/runs/{run_id}/report", tags=["Artifacts"])
async def get_report(run_id: str):
    """Get the final markdown report for a specific run."""
    run_path = DATA_DIR / "runs" / run_id
    report_path = run_path / "final_report.md"
    
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")
        
    return FileResponse(report_path)

@app.get("/runs/{run_id}/artifacts/{artifact_name}", tags=["Artifacts"])
async def get_artifact(run_id: str, artifact_name: str):
    """Get a specific JSON artifact (e.g., overseer_output, personas, strategies)."""
    run_path = DATA_DIR / "runs" / run_id
    state = StateManager(str(run_path))
    
    data = state.read(artifact_name)
    if not data:
        raise HTTPException(status_code=404, detail=f"Artifact '{artifact_name}' not found")
        
    return data


@app.get("/runs/{run_id}/state", tags=["History"])
async def get_run_state(run_id: str):
    """Return orchestrator state for a run."""
    run_path = DATA_DIR / "runs" / run_id
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
    # Use PORT env var for Railway, allow reload only in dev
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("api.server:app", host="0.0.0.0", port=port, reload=False)
