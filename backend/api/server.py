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



# Ensure data directory exists
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)


def _safe_upload_path(original_name: str) -> Path:
    """Return a unique, sanitized destination for an uploaded file."""
    name = Path(original_name or "uploaded")
    suffix = "".join(name.suffixes) or ".csv"
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    return DATA_DIR / safe_name


def convert_markdown_to_pdf(markdown_path: Path, pdf_path: Path):
    """Convert markdown file to PDF with styling."""
    try:
        import markdown as md
        from weasyprint import HTML
        
        # Read markdown
        with open(markdown_path, 'r', encoding='utf-8') as f:
            md_content = f.read()
        
        # Convert to HTML
        html_content = md.markdown(md_content, extensions=['tables', 'fenced_code'])
        
        # Add styling for better PDF formatting
        styled_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }}
        h1 {{ color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }}
        h2 {{ color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 5px; margin-top: 30px; }}
        h3 {{ color: #555; margin-top: 20px; }}
        table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 12px 8px; text-align: left; }}
        th {{ background-color: #3498db; color: white; font-weight: bold; }}
        tr:nth-child(even) {{ background-color: #f9f9f9; }}
        code {{ background-color: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }}
        pre {{ background-color: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }}
        blockquote {{ border-left: 4px solid #3498db; padding-left: 15px; color: #555; font-style: italic; }}
        strong {{ color: #2c3e50; }}
    </style>
</head>
<body>
    {html_content}
</body>
</html>"""
        
        # Generate PDF
        HTML(string=styled_html).write_pdf(pdf_path)
        
    except ImportError as e:
        raise HTTPException(
            status_code=501,
            detail="PDF generation not available. Missing dependencies: pip install weasyprint markdown"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")

@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint for Railway"""
    return {"status": "healthy", "service": "ACE V3 API"}


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
async def get_report(run_id: str, format: str = "markdown"):
    """Get the final report in markdown or PDF format.
    
    Args:
        run_id: The run identifier
        format: Output format - either 'markdown' or 'pdf' (default: markdown)
    
    Returns:
        FileResponse with the report file
    """
    run_path = DATA_DIR / "runs" / run_id
    report_path = run_path / "final_report.md"
    
    if not report_path.exists():
        raise HTTPException(status_code=404, detail="Report not found")
    
    if format.lower() == "pdf":
        pdf_path = run_path / "final_report.pdf"
        
        # Generate PDF if it doesn't exist or if markdown is newer
        if not pdf_path.exists() or pdf_path.stat().st_mtime < report_path.stat().st_mtime:
            convert_markdown_to_pdf(report_path, pdf_path)
        
        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"ace_report_{run_id}.pdf"
        )
    
    # Default: return markdown
    return FileResponse(
        report_path,
        media_type="text/markdown",
        filename=f"ace_report_{run_id}.md"
    )

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
    import os
    # Railway provides PORT env var
    port = int(os.getenv("PORT", 8001))
    # Use direct module reference since we're running from project root
    uvicorn.run("backend.api.server:app", host="0.0.0.0", port=port, reload=False)
