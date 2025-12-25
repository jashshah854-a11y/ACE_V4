from dataclasses import dataclass
from typing import Any, Dict, Optional

import jwt
import os
import re
import shutil
import sys
import uuid
import pandas as pd
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from pathlib import Path
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.orm import Session

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

# Fix for joblib warning on Windows
if os.name == 'nt':
    os.environ["LOKY_MAX_CPU_COUNT"] = str(os.cpu_count())

from accounts import models as account_models
from accounts import schemas as account_schemas
from accounts import services as account_services
from accounts.database import get_session, init_db
from accounts.security import ALGORITHM, create_access_token
from core.config import settings
from core.state_manager import StateManager
from jobs.models import JobStatus
from jobs.progress import ProgressTracker
from jobs.queue import enqueue, get_job
from observability.metrics import scrape_metrics
from connectors.manager import ConnectorStore

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="ACE V3 Intelligence API",
    description="Universal Autonomous Cognitive Entity Engine API",
    version="3.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.on_event("startup")
def _startup_event() -> None:
    """Initialize optional subsystems."""
    init_db()

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

connector_store = ConnectorStore(Path(settings.connectors_config_path))


def _require_owner(subject: Optional["SubjectContext"]):
    _require_subject(subject)
    if subject and not subject.is_owner:
        raise HTTPException(status_code=403, detail='Owner privileges required')


def _ensure_connectors_enabled():
    if not settings.connectors_enabled:
        raise HTTPException(status_code=400, detail='Connectors feature disabled')


def _load_source_metadata(run_path: Path) -> Optional[Dict[str, Any]]:
    manager = StateManager(str(run_path))
    source = manager.read("source_metadata")
    if source:
        return source
    run_config = manager.read("run_config") or {}
    if isinstance(run_config, dict):
        return run_config.get("source")
    return None


def _collect_run_details(run_path: Path) -> Dict[str, Any]:
    details: Dict[str, Any] = {"run_id": run_path.name}
    state_file = run_path / "orchestrator_state.json"
    if state_file.exists():
        try:
            with open(state_file, 'r', encoding='utf-8') as handle:
                state = json.load(handle)
            details["created_at"] = state.get("created_at")
            if state.get("status"):
                details["status"] = state.get("status")
        except Exception:
            details["created_at"] = None
    else:
        details["created_at"] = None

    source_meta = _load_source_metadata(run_path)
    if source_meta:
        details["source"] = source_meta
    return details


def get_db():
    with get_session() as session:
        yield session


bearer_scheme = HTTPBearer(auto_error=False)
api_token_header = APIKeyHeader(name="X-ACE-API-TOKEN", auto_error=False)


@dataclass
class SubjectContext:
    user_id: str
    org_id: Optional[str]
    role: str
    is_owner: bool
    via: str


def _require_subject(subject: Optional[SubjectContext]):
    if settings.auth_enabled and subject is None:
        raise HTTPException(status_code=401, detail="Authentication required")


def _subject_from_user(user: account_models.User) -> SubjectContext:
    return SubjectContext(
        user_id=user.id,
        org_id=user.org_id,
        role=user.role,
        is_owner=user.is_owner,
        via="user",
    )


def resolve_subject(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    api_token: Optional[str] = Depends(api_token_header),
    db: Session = Depends(get_db),
) -> Optional[SubjectContext]:
    if not settings.auth_enabled:
        return None

    if api_token:
        token = account_services.verify_api_token(db, api_token)
        if not token:
            raise HTTPException(status_code=401, detail="Invalid API token")
        user = token.user
        if not user:
            raise HTTPException(status_code=401, detail="Token user missing")
        return SubjectContext(
            user_id=user.id,
            org_id=user.org_id,
            role=user.role,
            is_owner=user.is_owner,
            via="api_token",
        )

    if not credentials:
        return None

    try:
        payload = jwt.decode(credentials.credentials, settings.token_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject")

    user = db.get(account_models.User, user_id)
    if not user or user.status != "active":
        raise HTTPException(status_code=401, detail="User inactive or missing")

    return _subject_from_user(user)


def _enforce_run_access(run_id: str, subject: Optional[SubjectContext], db: Session):
    if not settings.auth_enabled or subject is None:
        return

    binding = db.get(account_models.RunBinding, run_id)
    if not binding or not binding.org_id:
        return

    if binding.org_id != subject.org_id:
        raise HTTPException(status_code=404, detail="Run not found")

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


@app.post("/auth/signup", response_model=account_schemas.AuthenticatedUser, tags=["Auth"])
def signup(payload: account_schemas.SignupRequest, db: Session = Depends(get_db)):
    if not settings.auth_enabled:
        raise HTTPException(status_code=400, detail="Authentication is disabled")
    try:
        org, user = account_services.bootstrap_signup(
            db,
            org_name=payload.org_name,
            org_slug=payload.org_slug,
            email=payload.email,
            password=payload.password,
        )
    except account_services.AccountError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    token, expires = create_access_token(user.id, org.id)
    return account_schemas.AuthenticatedUser(
        token=token,
        expires_in=expires,
        user=account_schemas.UserRead.model_validate(user, from_attributes=True),
        organization=account_schemas.OrgRead.model_validate(org, from_attributes=True),
    )


@app.post("/auth/login", response_model=account_schemas.TokenResponse, tags=["Auth"])
def login(payload: account_schemas.LoginRequest, db: Session = Depends(get_db)):
    if not settings.auth_enabled:
        raise HTTPException(status_code=400, detail="Authentication is disabled")
    user = account_services.authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token, expires = create_access_token(user.id, user.org_id)
    return account_schemas.TokenResponse(access_token=token, expires_in=expires)


@app.post("/auth/api-tokens", response_model=account_schemas.ApiTokenResponse, tags=["Auth"])
def create_api_token(
    payload: account_schemas.ApiTokenCreate,
    subject: Optional[SubjectContext] = Depends(resolve_subject),
    db: Session = Depends(get_db),
):
    _require_subject(subject)
    if subject is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    user = db.get(account_models.User, subject.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    secret, token = account_services.create_api_token(db, user, payload.name, payload.scopes)
    return account_schemas.ApiTokenResponse(
        id=token.id,
        name=token.name,
        prefix=token.prefix,
        scopes=token.scopes,
        created_at=token.created_at,
        last_used_at=token.last_used_at,
        secret=secret,
    )


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


if settings.metrics_enabled:
    @app.get("/metrics", include_in_schema=False)
    async def metrics_endpoint():
        from fastapi import Response

        data = scrape_metrics()
        return Response(content=data, media_type="text/plain")


class RunResponse(BaseModel):
    run_id: str
    message: str
    status: str


class ConnectorRequest(BaseModel):
    name: str
    type: str
    enabled: bool = True
    interval_seconds: int = 3600
    options: Dict[str, Any] = {}


class ConnectorResponse(BaseModel):
    name: str
    type: str
    enabled: bool
    interval_seconds: int
    options: Dict[str, Any]

    @classmethod
    def from_config(cls, config: ConnectorConfig):
        return cls(**config.dict())



@app.get("/connectors", response_model=list[ConnectorResponse], tags=["Connectors"])
async def list_connectors(subject: Optional[SubjectContext] = Depends(resolve_subject)):
    _ensure_connectors_enabled()
    _require_owner(subject)
    configs = connector_store.list()
    return [ConnectorResponse.from_config(cfg) for cfg in configs]


@app.post("/connectors", response_model=ConnectorResponse, tags=["Connectors"])
async def create_or_update_connector(
    payload: ConnectorRequest,
    subject: Optional[SubjectContext] = Depends(resolve_subject),
):
    _ensure_connectors_enabled()
    _require_owner(subject)
    config = ConnectorConfig(**payload.dict())
    connector_store.upsert(config)
    return ConnectorResponse.from_config(config)


@app.delete("/connectors/{name}", tags=["Connectors"])
async def delete_connector(name: str, subject: Optional[SubjectContext] = Depends(resolve_subject)):
    _ensure_connectors_enabled()
    _require_owner(subject)
    deleted = connector_store.delete(name)
    if not deleted:
        raise HTTPException(status_code=404, detail="Connector not found")
    return {"status": "deleted"}

@app.post("/run", response_model=RunResponse, tags=["Execution"])
@limiter.limit("10/minute")
async def trigger_run(
    file: UploadFile = File(...),
    target_column: Optional[str] = Form(None),
    feature_whitelist: Optional[str] = Form(None),
    model_type: Optional[str] = Form(None),
    include_categoricals: Optional[str] = Form(None),
    fast_mode: Optional[str] = Form(None),
    project_slug: Optional[str] = Form(None),
    subject: Optional[SubjectContext] = Depends(resolve_subject),
    db: Session = Depends(get_db),
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

    tenant_info = None
    if settings.auth_enabled:
        _require_subject(subject)
        assert subject is not None
        slug = (project_slug or "default").strip().lower() or "default"
        project = account_services.ensure_project(
            db,
            org_id=subject.org_id,
            name=slug.replace("-", " ").title() or "Default Project",
            slug=slug,
        )
        tenant_info = {
            "org_id": subject.org_id,
            "project_id": project.id,
            "project_slug": project.slug,
        }
        run_config = run_config or {}
        run_config["tenant"] = tenant_info

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

        if tenant_info:
            account_services.bind_run(
                db,
                run_id=run_id,
                org_id=tenant_info.get("org_id"),
                project_id=tenant_info.get("project_id"),
                run_path=None,
            )

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
async def get_progress(
    run_id: str,
    subject: Optional[SubjectContext] = Depends(resolve_subject),
    db: Session = Depends(get_db),
):
    _validate_run_id(run_id)
    if settings.auth_enabled:
        _require_subject(subject)
    _enforce_run_access(run_id, subject, db)
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
async def get_report(
    request: Request,
    run_id: str,
    format: str = "markdown",
    subject: Optional[SubjectContext] = Depends(resolve_subject),
    db: Session = Depends(get_db),
):
    """Get the final report in markdown or PDF format.

    Args:
        run_id: The run identifier
        format: Output format - either 'markdown' or 'pdf' (default: markdown)

    Returns:
        FileResponse with the report file

    Rate limit: 30 requests per minute
    """
    _validate_run_id(run_id)
    if settings.auth_enabled:
        _require_subject(subject)
    _enforce_run_access(run_id, subject, db)

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

@app.get("/runs/{run_id}/evidence/sample", tags=["Artifacts"])
async def get_evidence_sample(run_id: str, evidence_id: str | None = None, rows: int = 5):
    """
    Return a small sample of the source dataset (redacted) for evidence inspection.
    If evidence_id is provided and insights.json exists, attempt to use its column hints to limit sample.
    """
    _validate_run_id(run_id)
    rows = max(1, min(rows, 10))
    run_path = DATA_DIR / "runs" / run_id
    state = StateManager(str(run_path))

    active = state.read("active_dataset") or {}
    dataset_path = active.get("path")
    if not dataset_path or not Path(dataset_path).exists():
        raise HTTPException(status_code=404, detail="Dataset not found for this run")

    columns_hint = None
    if evidence_id:
        insights_path = Path(run_path) / "artifacts" / "insights.json"
        if insights_path.exists():
            try:
                insights = json.loads(insights_path.read_text(encoding="utf-8"))
                if isinstance(insights, list):
                    for item in insights:
                        if isinstance(item, dict) and str(item.get("id")) == str(evidence_id):
                            columns_hint = item.get("columns") or item.get("fields")
                            break
            except Exception:
                columns_hint = None

    df = None
    try:
        if str(dataset_path).lower().endswith(".parquet"):
            df = pd.read_parquet(dataset_path)
        else:
            df = pd.read_csv(dataset_path, nrows=rows * 2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dataset: {e}")

    if columns_hint and isinstance(columns_hint, (list, tuple, set)):
        cols = [c for c in columns_hint if c in df.columns]
        if cols:
            df = df[cols]

    # Simple redaction: drop common sensitive columns
    redact_cols = [c for c in df.columns if any(k in c.lower() for k in ["email", "phone", "ssn", "password"])]
    if redact_cols:
        df = df.drop(columns=redact_cols)

    sample = df.head(rows).to_dict(orient="records")
    return {"rows": sample, "row_count": len(sample)}

@app.get("/runs/{run_id}/diagnostics", tags=["Artifacts"])
async def get_diagnostics(run_id: str):
    """
    Return Safe Mode / validation diagnostics for a run.
    """
    _validate_run_id(run_id)
    run_path = DATA_DIR / "runs" / run_id
    state = StateManager(str(run_path))

    validation = state.read("validation_report") or {}
    identity = state.read("dataset_identity_card") or {}
    confidence = state.read("confidence_report") or {}
    mode = state.read("run_mode") or "strict"

    has_time = False
    if isinstance(identity, dict):
        cols = []
        if "columns" in identity:
            cols = identity.get("columns") or []
        if "fields" in identity:
            cols.extend([f.get("name") for f in identity.get("fields") if isinstance(f, dict) and f.get("name")])
        cols = [c for c in cols if c]
        has_time = any("date" in c.lower() or "time" in c.lower() for c in cols)

    reasons = []
    if validation.get("mode") == "limitations":
        reasons.append("Validation: limitations mode")
    if validation.get("target_column") in [None, ""]:
        reasons.append("Validation: missing target column")
    if not has_time:
        reasons.append("Identity: time fields not detected")
    if confidence.get("confidence_label") == "low":
        reasons.append("Confidence: low")

    return {
        "mode": mode,
        "validation": validation,
        "identity": identity,
        "confidence": confidence,
        "reasons": reasons,
    }

@app.get("/runs/{run_id}/model-artifacts", tags=["Artifacts"])
async def get_model_artifacts(run_id: str):
    """
    Return model transparency artifacts (feature importances/coefficients) if available.
    """
    _validate_run_id(run_id)
    run_path = DATA_DIR / "runs" / run_id
    state = StateManager(str(run_path))

    regression = state.read("regression_insights") or {}
    enhanced = state.read("enhanced_analytics") or {}

    feature_importance = regression.get("feature_importance") or enhanced.get("feature_importance")
    coefficients = regression.get("coefficients") or enhanced.get("coefficients")

    if not feature_importance and not coefficients:
        raise HTTPException(status_code=404, detail="Model artifacts not found")

    return {
        "feature_importance": feature_importance,
        "coefficients": coefficients,
    }


@app.get("/runs/{run_id}/diff/{other_run_id}", tags=["Artifacts"])
async def diff_runs(run_id: str, other_run_id: str):
    """
    Minimal diff: compare confidence and presence of overseer/personas/strategies between two runs.
    """
    _validate_run_id(run_id)
    _validate_run_id(other_run_id)

    def load(run: str):
        rp = DATA_DIR / "runs" / run
        st = StateManager(str(rp))
        return {
            "confidence": st.read("confidence_report") or {},
            "overseer": st.read("overseer_output") or {},
            "personas": st.read("personas") or {},
            "strategies": st.read("strategies") or {},
        }

    a = load(run_id)
    b = load(other_run_id)

    def get_conf(c):
        return c.get("data_confidence") or c.get("confidence_score") or 0

    diff = {
        "confidence_delta": get_conf(a["confidence"]) - get_conf(b["confidence"]),
        "segments_delta": (len(a["overseer"].get("labels") or []) - len(b["overseer"].get("labels") or [])),
        "personas_delta": (len(a["personas"].get("personas") or []) - len(b["personas"].get("personas") or [])),
        "strategies_delta": (len(a["strategies"].get("strategies") or []) - len(b["strategies"].get("strategies") or [])),
    }
    return {"run_a": run_id, "run_b": other_run_id, "diff": diff}


@app.get("/runs/{run_id}/pptx", tags=["Artifacts"])
async def export_pptx(run_id: str):
    """
    Placeholder for PPTX Evidence Deck export.
    """
    raise HTTPException(status_code=501, detail="PPTX export not implemented yet.")
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
async def get_run_state(
    request: Request,
    run_id: str,
    subject: Optional[SubjectContext] = Depends(resolve_subject),
    db: Session = Depends(get_db),
):
    """Return orchestrator state for a run.

    Rate limit: 60 requests per minute (allows polling)
    """
    _validate_run_id(run_id)
    if settings.auth_enabled:
        _require_subject(subject)
    _enforce_run_access(run_id, subject, db)

    run_path = DATA_DIR / "runs" / run_id
    state_path = run_path / "orchestrator_state.json"

    if not state_path.exists():
        raise HTTPException(status_code=404, detail="State not found")

    with open(state_path, "r", encoding="utf-8") as f:
        state = json.load(f)
    source_meta = _load_source_metadata(run_path)
    if source_meta:
        state["source"] = source_meta

    # Ensure progress fields exist for backward compatibility
    if "progress" not in state:
        sys.path.append(str(Path(__file__).parent.parent))
        from core.pipeline_map import calculate_progress
        progress_info = calculate_progress(
            state.get("current_step", ""),
            state.get("steps_completed", [])
        )
        state.update(progress_info)

    # Ensure progress is clamped to 0-100
    state["progress"] = max(0, min(100, state.get("progress", 0)))

    return state

@app.get("/runs", tags=["History"])
@limiter.limit("100/minute")
async def list_runs(
    request: Request,
    limit: int = 50,
    offset: int = 0,
    subject: Optional[SubjectContext] = Depends(resolve_subject),
    db: Session = Depends(get_db),
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
        runs_dir.mkdir(parents=True, exist_ok=True)

    all_runs = sorted(
        [r.name for r in runs_dir.iterdir() if r.is_dir()],
        reverse=True
    )

    if settings.auth_enabled:
        _require_subject(subject)
        tenant_ids = set()
        if subject is not None:
            stmt = select(account_models.RunBinding.run_id).where(account_models.RunBinding.org_id == subject.org_id)
            tenant_ids = {row[0] for row in db.execute(stmt)}
        all_runs = [run for run in all_runs if run in tenant_ids]

    paginated_runs = all_runs[offset:offset + limit]

    run_details = []
    for run in paginated_runs:
        run_path = runs_dir / run
        run_details.append(_collect_run_details(run_path) if run_path.exists() else {"run_id": run})

    return {
        "runs": paginated_runs,
        "total": len(all_runs),
        "limit": limit,
        "offset": offset,
        "has_more": offset + limit < len(all_runs),
        "run_details": run_details,
    }


if __name__ == "__main__":
    import uvicorn
    import os
    # Railway provides PORT env var
    port = int(os.getenv("PORT", 8001))
    # Use direct module reference since we're running from project root
    uvicorn.run("backend.api.server:app", host="0.0.0.0", port=port, reload=False)
