from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Form
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import shutil
import os
import sys
import json
import uuid
import re
from pathlib import Path
from typing import Any, Dict, Optional

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

# Fix for joblib warning on Windows
if os.name == 'nt':
    os.environ["LOKY_MAX_CPU_COUNT"] = str(os.cpu_count())

from core.state_manager import StateManager
from jobs.queue import enqueue, get_job
from jobs.models import JobStatus
from jobs.progress import ProgressTracker
from core.config import settings

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="ACE V3 Intelligence API",
    description="Universal Autonomous Cognitive Entity Engine API",
    version="3.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Secure CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)



# Ensure data directory exists
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)


ALLOWED_EXTENSIONS = {'.csv', '.json', '.xlsx', '.xls', '.parquet'}
ALLOWED_MIME_TYPES = {
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream'
}
MAX_FILENAME_LENGTH = 255


def _validate_run_id(run_id: str) -> None:
    """Validate run_id format to prevent path traversal attacks."""
    if not run_id:
        raise HTTPException(status_code=400, detail="Run ID is required")

    if not re.match(r'^[a-f0-9-]{8,36}$', run_id, re.IGNORECASE):
        raise HTTPException(
            status_code=400,
            detail="Invalid run ID format"
        )


def _validate_upload(file: UploadFile) -> None:
    """Validate uploaded file for security and size constraints."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    if len(file.filename) > MAX_FILENAME_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Filename too long (max {MAX_FILENAME_LENGTH} characters)"
        )

    filename_lower = file.filename.lower()
    if not any(filename_lower.endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid MIME type: {file.content_type}"
        )


def _safe_upload_path(original_name: str) -> Path:
    """Return a unique, sanitized destination for an uploaded file."""
    name = Path(original_name or "uploaded")
    suffix = "".join(name.suffixes) or ".csv"

    if suffix.lower() not in ALLOWED_EXTENSIONS:
        suffix = ".csv"

    safe_name = f"{uuid.uuid4().hex}{suffix}"
    return DATA_DIR / safe_name


def _parse_bool(value: Any) -> Optional[bool]:
    if value is None:
        return None
    val = str(value).strip().lower()
    if val in {"1", "true", "yes", "on"}:
        return True
    if val in {"0", "false", "no", "off"}:
        return False
    return None


def _build_run_config(
    target_column: Optional[str] = None,
    feature_whitelist: Optional[str] = None,
    model_type: Optional[str] = None,
    include_categoricals: Optional[str] = None,
    fast_mode: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Collect optional modeling parameters without re-reading the upload body."""
    config: Dict[str, Any] = {}

    if target_column:
        config["target_column"] = target_column

    if feature_whitelist:
        parsed_features = None
        try:
            parsed_features = json.loads(feature_whitelist)
        except Exception:
            parsed_features = [f.strip() for f in str(feature_whitelist).split(",") if f.strip()]
        if isinstance(parsed_features, (list, tuple, set)):
            config["feature_whitelist"] = list(parsed_features)

    if model_type:
        config["model_type"] = model_type

    include_cats = _parse_bool(include_categoricals)
    if include_cats is not None:
        config["include_categoricals"] = include_cats

    fast = _parse_bool(fast_mode)
    if fast is not None:
        config["fast_mode"] = fast

    return config or None


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
    """Health check endpoint with dependency validation.

    Returns:
        status: healthy, degraded, or unhealthy
        service: Service name
        checks: Individual dependency status
    """
    checks = {}
    overall_status = "healthy"

    try:
        test_file = DATA_DIR / ".health_check"
        test_file.touch()
        test_file.unlink()
        checks["storage"] = "ok"
    except Exception as e:
        checks["storage"] = f"failed: {str(e)}"
        overall_status = "degraded"

    try:
        runs_dir = DATA_DIR / "runs"
        runs_dir.mkdir(exist_ok=True)
        checks["runs_directory"] = "ok"
    except Exception as e:
        checks["runs_directory"] = f"failed: {str(e)}"
        overall_status = "degraded"

    return {
        "status": overall_status,
        "service": "ACE V3 API",
        "checks": checks
    }


class RunResponse(BaseModel):
    run_id: str
    message: str
    status: str

@app.post("/run/preview", tags=["Execution"])
@limiter.limit("30/minute")
async def preview_dataset(request: Request, file: UploadFile = File(...)):
    """
    Quick preview of dataset structure without running full analysis.
    Returns schema information, row/column counts, and detected capabilities.

    Rate limit: 30 requests per minute
    """
    _validate_upload(file)

    file_path = _safe_upload_path(file.filename)

    try:
        # Save file temporarily
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Import data loader
        from intake.loader import DataLoader

        # Load and analyze dataset
        loader = DataLoader(str(file_path))
        df = loader.load()

        if df is None or df.empty:
            raise HTTPException(status_code=400, detail="Could not load dataset or dataset is empty")

        # Build schema map
        schema_map = []
        for col in df.columns:
            dtype = df[col].dtype
            if dtype in ['int64', 'float64', 'int32', 'float32']:
                col_type = "Numeric"
            elif dtype == 'bool':
                col_type = "Boolean"
            elif dtype == 'datetime64[ns]':
                col_type = "DateTime"
            else:
                col_type = "String"

            schema_map.append({
                "name": col,
                "type": col_type,
                "dtype": str(dtype)
            })

        # Detect capabilities
        numeric_cols = [c for c in schema_map if c["type"] == "Numeric"]
        datetime_cols = [c for c in schema_map if c["type"] == "DateTime"]

        # Check for financial columns
        financial_keywords = ['price', 'cost', 'amount', 'revenue', 'profit', 'loss', 'balance', 'payment', 'fee', 'charge']
        has_financial = any(
            any(keyword in col["name"].lower() for keyword in financial_keywords)
            for col in schema_map
        )

        # Calculate quality score (simple version)
        missing_ratio = df.isnull().sum().sum() / (len(df) * len(df.columns))
        quality_score = 1.0 - missing_ratio

        return {
            "row_count": len(df),
            "column_count": len(df.columns),
            "schema_map": schema_map,
            "detected_capabilities": {
                "has_numeric_columns": len(numeric_cols) > 0,
                "has_time_series": len(datetime_cols) > 0,
                "has_financial_columns": has_financial
            },
            "quality_score": round(quality_score, 3)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")
    finally:
        # Clean up temporary file
        file_path.unlink(missing_ok=True)


@app.post("/run", response_model=RunResponse, tags=["Execution"])
@limiter.limit("10/minute")
async def trigger_run(
    file: UploadFile = File(...),
    target_column: Optional[str] = Form(None),
    feature_whitelist: Optional[str] = Form(None),
    model_type: Optional[str] = Form(None),
    include_categoricals: Optional[str] = Form(None),
    fast_mode: Optional[str] = Form(None),
):
    """
    Upload a data file and enqueue a full ACE V3 run for background processing.
    Returns the Run ID (job identifier).

    Accepts: CSV, JSON, XLSX, XLS, Parquet files (max configured size)
    Rate limit: 10 requests per minute
    """
    _validate_upload(file)

    file_path = _safe_upload_path(file.filename)
    run_config = _build_run_config(
        target_column=target_column,
        feature_whitelist=feature_whitelist,
        model_type=model_type,
        include_categoricals=include_categoricals,
        fast_mode=fast_mode,
    )

    try:
        bytes_written = 0
        with open(file_path, "wb") as buffer:
            chunk_size = 1024 * 1024
            while chunk := await file.read(chunk_size):
                bytes_written += len(chunk)

                if bytes_written > settings.max_upload_size_bytes:
                    buffer.close()
                    file_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large (max {settings.max_upload_size_mb}MB)"
                    )

                buffer.write(chunk)

        run_id = enqueue(str(file_path), run_config=run_config)

        return {
            "run_id": run_id,
            "message": "ACE V3 run queued. A worker will process it shortly.",
            "status": "queued"
        }
    except HTTPException:
        raise
    except Exception as e:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"ACE Execution Failed: {str(e)}")

@app.get("/runs/{run_id}/progress", tags=["Execution"])
async def get_progress(run_id: str):
    _validate_run_id(run_id)
    job = get_job(run_id)
    if not job:
        raise HTTPException(status_code=404, detail="Run not found")

    progress = {}
    state = None
    if job.run_path:
        progress_tracker = ProgressTracker(job.run_path)
        progress = progress_tracker.read() or {}
        state_path = Path(job.run_path) / "orchestrator_state.json"
        if state_path.exists():
            with open(state_path, "r", encoding="utf-8") as f:
                state = json.load(f)

    return {
        "job": {
            "run_id": job.run_id,
            "status": job.status.value if isinstance(job.status, JobStatus) else job.status,
            "message": job.message,
            "run_path": job.run_path,
            "created_at": getattr(job, "created_at", None),
            "updated_at": getattr(job, "updated_at", None),
        },
        "progress": progress,
        "state": state,
    }

@app.get("/runs/{run_id}/report", tags=["Artifacts"])
@limiter.limit("30/minute")
async def get_report(request: Request, run_id: str, format: str = "markdown"):
    """Get the final report in markdown or PDF format.

    Args:
        run_id: The run identifier
        format: Output format - either 'markdown' or 'pdf' (default: markdown)

    Returns:
        FileResponse with the report file

    Rate limit: 30 requests per minute
    """
    _validate_run_id(run_id)

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
    _validate_run_id(run_id)

    if not re.match(r'^[a-zA-Z0-9_-]+$', artifact_name):
        raise HTTPException(status_code=400, detail="Invalid artifact name")

    run_path = DATA_DIR / "runs" / run_id
    state = StateManager(str(run_path))
    
    data = state.read(artifact_name)
    if not data:
        raise HTTPException(status_code=404, detail=f"Artifact '{artifact_name}' not found")
        
    return data


@app.get("/runs/{run_id}/enhanced-analytics", tags=["Artifacts"])
async def get_enhanced_analytics(run_id: str):
    """Get enhanced analytics data including correlations, distributions, and business intelligence.

    Returns:
        Enhanced analytics data with statistical analysis and business metrics
    """
    _validate_run_id(run_id)

    run_path = DATA_DIR / "runs" / run_id
    state = StateManager(str(run_path))

    enhanced_analytics = state.read("enhanced_analytics")
    if not enhanced_analytics:
        raise HTTPException(status_code=404, detail="Enhanced analytics not found")

    return enhanced_analytics

@app.get("/runs/{run_id}/insights", tags=["Artifacts"])
async def get_key_insights(run_id: str):
    """Extract and return key insights from analysis.

    Returns:
        warnings: List of issues requiring attention
        strengths: List of positive findings
        recommendations: List of suggested actions
    """
    _validate_run_id(run_id)

    run_path = DATA_DIR / "runs" / run_id
    state = StateManager(str(run_path))

    overseer = state.read("overseer_output") or {}
    anomalies = state.read("anomalies") or {}
    regression = state.read("regression_insights") or {}

    warnings = []
    strengths = []
    recommendations = []
    
    # Extract data quality metrics
    quality = overseer.get("stats", {}).get("data_quality", 1.0)
    anomaly_count = anomalies.get("anomaly_count", 0)
    r2 = regression.get("metrics", {}).get("r2")
    k = overseer.get("stats", {}).get("k", 0)
    silhouette = overseer.get("stats", {}).get("silhouette", 0)
    
    # Warnings - issues requiring attention
    if anomaly_count > 50:
        warnings.append(f"{anomaly_count} anomalies detected - requires immediate attention")
    elif anomaly_count > 20:
        warnings.append(f"{anomaly_count} anomalies detected - recommend review")
    
    if quality < 0.7:
        warnings.append(f"Low data quality ({quality:.1%}) - results may be unreliable")
    elif quality < 0.85:
        warnings.append(f"Moderate data quality ({quality:.1%}) - consider data cleaning")
    
    if r2 is not None and r2 < 0.5:
        warnings.append(f"Low predictive power (R² = {r2:.2f}) - model may not be reliable")
    
    if silhouette < 0.3 and k > 1:
        warnings.append(f"Weak cluster separation (silhouette = {silhouette:.2f})")
    
    # Strengths - positive findings
    if quality >= 0.9:
        strengths.append(f"Excellent data quality ({quality:.1%})")
    elif quality >= 0.8:
        strengths.append(f"Good data quality ({quality:.1%})")
    
    if r2 is not None and r2 > 0.8:
        strengths.append(f"Strong predictive correlation (R² = {r2:.2f})")
    elif r2 is not None and r2 > 0.6:
        strengths.append(f"Moderate predictive correlation (R² = {r2:.2f})")
    
    if k >= 3 and silhouette > 0.5:
        strengths.append(f"Clear segmentation with {k} distinct patterns (silhouette = {silhouette:.2f})")
    elif k >= 2:
        strengths.append(f"Identified {k} behavioral segments")
    
    if anomaly_count == 0:
        strengths.append("No anomalies detected - clean dataset")
    elif anomaly_count < 10:
        strengths.append(f"Minimal anomalies detected ({anomaly_count})")
    
    # Recommendations - suggested actions
    if anomaly_count > 20:
        recommendations.append("Review anomalous records for data quality issues or genuine outliers")
    
    if quality < 0.9:
        recommendations.append("Improve data collection and validation processes")
    
    if r2 is not None and r2 < 0.6:
        recommendations.append("Consider additional features or alternative modeling approaches")
    
    if k == 1:
        recommendations.append("Dataset shows homogeneous patterns - consider different segmentation criteria")
    
    # If no insights found, add default message
    if not warnings and not strengths:
        strengths.append("Analysis completed successfully")
    
    return {
        "warnings": warnings,
        "strengths": strengths,
        "recommendations": recommendations,
        "metadata": {
            "quality_score": quality,
            "anomaly_count": anomaly_count,
            "model_r2": r2,
            "cluster_count": k
        }
    }


@app.get("/runs/{run_id}/state", tags=["History"])
@limiter.limit("60/minute")
async def get_run_state(request: Request, run_id: str):
    """Return orchestrator state for a run.

    Rate limit: 60 requests per minute (allows polling)
    """
    _validate_run_id(run_id)

    run_path = DATA_DIR / "runs" / run_id
    state_path = run_path / "orchestrator_state.json"

    if not state_path.exists():
        raise HTTPException(status_code=404, detail="State not found")

    with open(state_path, "r", encoding="utf-8") as f:
        state = json.load(f)

    # Ensure progress fields exist (for backward compatibility)
    if "progress" not in state:
        sys.path.append(str(Path(__file__).parent.parent))
        from core.pipeline_map import calculate_progress
        progress_info = calculate_progress(
            state.get("current_step", ""),
            state.get("steps_completed", [])
        )
        state.update(progress_info)

    # Ensure progress is clamped 0-100
    state["progress"] = max(0, min(100, state.get("progress", 0)))

    return state

@app.get("/runs", tags=["History"])
@limiter.limit("100/minute")
async def list_runs(
    request: Request,
    limit: int = 50,
    offset: int = 0
):
    """List available runs with pagination.

    Args:
        limit: Maximum number of runs to return (1-1000, default 50)
        offset: Number of runs to skip (default 0)

    Returns:
        Dictionary with runs list, total count, limit, and offset

    Rate limit: 100 requests per minute
    """
    if limit > 1000:
        limit = 1000
    if limit < 1:
        limit = 1
    if offset < 0:
        offset = 0

    runs_dir = DATA_DIR / "runs"
    if not runs_dir.exists():
        return {
            "runs": [],
            "total": 0,
            "limit": limit,
            "offset": offset
        }

    all_runs = sorted(
        [r.name for r in runs_dir.iterdir() if r.is_dir()],
        reverse=True
    )

    paginated_runs = all_runs[offset:offset + limit]

    return {
        "runs": paginated_runs,
        "total": len(all_runs),
        "limit": limit,
        "offset": offset,
        "has_more": offset + limit < len(all_runs)
    }


if __name__ == "__main__":
    import uvicorn
    import os
    # Railway provides PORT env var
    port = int(os.getenv("PORT", 8001))
    # Use direct module reference since we're running from project root
    uvicorn.run("backend.api.server:app", host="0.0.0.0", port=port, reload=False)
