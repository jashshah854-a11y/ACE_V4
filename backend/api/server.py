from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Form
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, StreamingResponse
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
import logging
import threading
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, Optional, List

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

# Phase 5 Imports (Moved to top to prevent NameError)
from backend.api.decision_models import (
    DecisionTouch, 
    DecisionTouchCreate, 
    ActionOutcome, 
    ActionOutcomeCreate,
    PatternCandidate
)

# Fix for joblib warning on Windows
if os.name == 'nt':
    os.environ["LOKY_MAX_CPU_COUNT"] = str(os.cpu_count())

from core.state_manager import StateManager
from jobs.redis_queue import RedisJobQueue  # Changed from SQLite queue
from jobs.models import JobStatus
from jobs.progress import ProgressTracker
from core.config import settings
from core.task_contract import parse_task_intent, TaskIntentValidationError
from api.contextual_intelligence import AskRequest, process_ask_query
from core.simulation import SimulationEngine
from core.enhanced_analytics import EnhancedAnalytics
from core.governance import rebuild_governance_artifacts
from core.analytics_validation import apply_artifact_validation
import pandas as pd

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ace.api")

# Global Redis queue instance (initialized on startup)
job_queue: Optional[RedisJobQueue] = None

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="ACE V4 Intelligence API",
    description="Universal Autonomous Cognitive Entity Engine API",
    version="4.0.0"
)

# Phase 5: Imports and Globals
from backend.api.decision_models import (
    DecisionTouch, 
    DecisionTouchCreate, 
    ActionOutcome, 
    ActionOutcomeCreate,
    PatternCandidate,
    Reflection,
    MemoryAssertion,
    UserMemoryState,
    ReconciliationNote,
    BeliefCoherenceState
)

# In-Memory Storage (Temporary until 5.3 DB)
decision_touches: Dict[str, DecisionTouch] = {}
action_outcomes: Dict[str, ActionOutcome] = {}
reflections: Dict[str, Reflection] = {}
memory_assertions: Dict[str, MemoryAssertion] = {}
user_memory_states: Dict[str, UserMemoryState] = {}
reconciliation_notes: Dict[str, ReconciliationNote] = {}
belief_coherence_states: Dict[str, BeliefCoherenceState] = {}

# Phase 6.1: Safety Infrastructure
from backend.safety.safety_guard import SafetyGuard, ConsentProvider
from backend.safety.circuit_breaker import CircuitBreaker

# Initialize global safety components
consent_provider = ConsentProvider()
safety_guard = SafetyGuard(consent_provider)
circuit_breaker = CircuitBreaker()

# KILL SWITCHES (Phase 5 Maintenance) - DEPRECATED
# These are now managed by SafetyGuard
# Kept for backwards compatibility
KILL_SWITCH_REFLECTION_GLOBAL_OFF = False
KILL_SWITCH_PATTERN_MONITOR_PAUSE = False

# Phase 5 Safety Infrastructure (Global Instances)
from backend.core.consent_provider import create_consent_provider
from backend.core.audit_logger import AuditLogger
from backend.core.circuit_breaker import CircuitBreaker
from backend.core.safety_guard import SafetyGuard

safety_guard: Optional[SafetyGuard] = None
consent_provider = None
audit_logger = None
circuit_breaker = None

app.state.limiter = limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Secure CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize Redis queue, background worker, and safety infrastructure on application startup."""
    global job_queue, safety_guard, consent_provider, audit_logger, circuit_breaker
    
    logger.info("[API] Starting application...")
    
    # Initialize Phase 5 Safety Infrastructure
    try:
        logger.info("[API] Initializing safety infrastructure...")
        
        # Consent provider (mock mode for Phase 6.0)
        consent_mode = os.getenv("CONSENT_PROVIDER_MODE", "mock")
        consent_provider = create_consent_provider(mode=consent_mode)
        logger.info(f"[API] ✅ Consent provider initialized (mode: {consent_mode})")
        
        # Audit logger
        audit_logger = AuditLogger(mode="file")
        logger.info("[API] ✅ Audit logger initialized")
        
        # Circuit breaker
        circuit_breaker = CircuitBreaker()
        logger.info("[API] ✅ Circuit breaker initialized")
        
        # Safety guard
        safety_guard = SafetyGuard(
            consent_provider=consent_provider,
            circuit_breaker=circuit_breaker,
            audit_logger=audit_logger
        )
        logger.info("[API] ✅ Safety guard initialized")
        logger.info(f"[API]    - KILL_SWITCH_REFLECTION_GLOBAL_OFF: {safety_guard.kill_switch_reflection_off}")
        logger.info(f"[API]    - KILL_SWITCH_PATTERN_MONITOR_PAUSE: {safety_guard.kill_switch_pattern_pause}")
        
    except Exception as e:
        logger.exception("[API] ❌ CRITICAL: Failed to initialize safety infrastructure")
        logger.error(f"[API] Error: {e}")
        logger.error("[API] Phase 5 features will not be available")
    
    # Initialize Redis queue
    try:
        redis_url = os.getenv("REDIS_URL")
        if not redis_url:
            logger.error("[API] REDIS_URL environment variable not set!")
            logger.error("[API] Job queue will not be available")
            return
        
        logger.info(f"[API] Initializing Redis queue (URL: {redis_url[:25]}...)")
        job_queue = RedisJobQueue(redis_url)
        logger.info("[API] ✅ Redis queue initialized successfully")
        
        # Start background worker thread
        logger.info("[API] Starting background worker thread...")
        from jobs.worker import worker_loop
        worker_thread = threading.Thread(target=worker_loop, daemon=True, name="ACE-Worker")
        worker_thread.start()
        logger.info("[API] ✅ Background worker started successfully")
        
    except Exception as e:
        logger.exception("[API] ❌ CRITICAL: Failed to initialize Redis queue or worker")
        logger.error(f"[API] Error: {e}")
        logger.error("[API] Job queue will not be available - /run endpoint will return 503")
        # Don't raise - let app start but /run will return 503

# FORCE REBUILD 2026-01-05T02:28:00


# LAW 1: Import Unified DATA_DIR from config (Single Source of Truth)
from core.config import DATA_DIR

print(f"🚀 SERVER STARTING - VERSION: UNIFIED_ANCHOR_V4 - DATA_DIR: {DATA_DIR.absolute()}")
try:
    sys.path.append(str(Path(__file__).parent.parent))
    import jobs.redis_queue
    print("✅ jobs.redis_queue import verified")
except ImportError as e:
    print(f"❌ CRITICAL: jobs.redis_queue import failed: {e}")


# OPERATION UNSINKABLE - Layer 1: The Gatekeeper
# Hard-coded file extensions (NEVER reject valid data files)
ALLOWED_EXTENSIONS = {'.csv', '.tsv', '.txt', '.json', '.xlsx', '.parquet', '.xls'}
ALLOWED_MIME_TYPES = {
    'text/csv',
    'text/plain',
    'text/tab-separated-values',
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


def _normalize_columns(columns: Any) -> Dict[str, Any]:
    if isinstance(columns, dict):
        return columns
    normalized: Dict[str, Any] = {}
    if isinstance(columns, list):
        for idx, col in enumerate(columns):
            if not isinstance(col, dict):
                continue
            name = col.get("name") or col.get("column") or f"column_{idx}"
            if not name:
                continue
            normalized[str(name)] = col
    return normalized


def _is_numeric_dtype(meta: Dict[str, Any]) -> bool:
    dtype = str(meta.get("dtype") or meta.get("type") or "").lower()
    numeric_tokens = ("int", "float", "double", "decimal", "number")
    return any(token in dtype for token in numeric_tokens)


def _ensure_identity_card(state: StateManager, run_path: Path) -> Dict[str, Any]:
    identity = state.read("dataset_identity_card")
    if isinstance(identity, dict) and identity:
        return identity

    card_path = Path(run_path) / "artifacts" / "dataset_identity_card.json"
    if card_path.exists():
        try:
            with open(card_path, "r", encoding="utf-8") as f:
                identity = json.load(f)
                state.write("dataset_identity_card", identity)
                return identity
        except Exception as exc:
            logger.warning(f"[IDENTITY] Failed to load dataset_identity_card.json: {exc}")

    try:
        rebuild_governance_artifacts(state)
        identity = state.read("dataset_identity_card")
        if isinstance(identity, dict):
            return identity
    except Exception as exc:
        logger.warning(f"[IDENTITY] Unable to rebuild identity artifacts: {exc}")

    return {}


class TimelineSelection(BaseModel):
    column: Optional[str] = None


def _iso_now():
    return datetime.utcnow().isoformat(timespec='seconds') + 'Z'


def _safe_upload_path(original_name: str) -> Path:
    """Return a unique, sanitized destination for an uploaded file."""
    name = Path(original_name or "uploaded")
    suffix = "".join(name.suffixes) or ".csv"

    if suffix.lower() not in ALLOWED_EXTENSIONS:
        suffix = ".csv"

    safe_name = f"{uuid.uuid4().hex}{suffix}"
    return DATA_DIR / safe_name



class DatasetIdentity(BaseModel):
    row_count: int
    column_count: int
    file_type: str
    schema_map: list[Dict[str, Any]]
    quality_score: float
    critical_gaps: list[str]
    detected_capabilities: Dict[str, bool]
    warnings: list[str]


def _infer_type(series):
    """Simple type inference for schema map"""
    try:
        if pd.api.types.is_numeric_dtype(series):
            return "Numeric"
        if pd.api.types.is_datetime64_any_dtype(series):
            return "DateTime"
        return "String"
    except:
        return "String"

def _build_schema_map(df):
    """Extract top 5 columns with types and samples"""
    schema = []
    try:
        for col in df.columns[:5]:
            schema.append({
                "name": str(col),
                "type": _infer_type(df[col]),
                "sample": str(df[col].dropna().iloc[0]) if not df[col].dropna().empty else "N/A"
            })
    except:
        pass
    return schema

def _calculate_quality_score(df):
    """Calculate data quality (0.0 - 1.0) with enforced minimum floor"""
    if df.empty:
        return 0.05  # FLOOR: Even empty data gets minimal score
    try:
        completeness = 1 - df.isnull().sum().sum() / (len(df) * len(df.columns))
        # FLOOR: Never return exactly 0.0 for readable datasets
        return max(round(float(completeness), 2), 0.05)
    except:
        return 0.05  # FLOOR: Failures default to minimal viable score

def _detect_gaps(df):
    """Detect critical data gaps"""
    gaps = []
    if df.empty:
        gaps.append("EMPTY_DATASET")
        return gaps
        
    try:
        null_rate = df.isnull().sum().sum() / (len(df) * len(df.columns))
        if null_rate > 0.5:
            gaps.append("HIGH_NULL_RATE")
    except:
        pass
        
    return gaps

def _detect_capabilities(df):
    """Detect what analysis types the data supports"""
    try:
        cols_lower = [str(c).lower() for c in df.columns]
        
        has_financial = any(x in c for c in cols_lower for x in ['revenue', 'price', 'cost', 'sales', 'budget', 'amount', 'profit'])
        has_time = any(x in c for c in cols_lower for x in ['date', 'time', 'year', 'month', 'day', 'timestamp'])
        has_numeric = any(pd.api.types.is_numeric_dtype(df[c]) for c in df.columns)
        has_categorical = any(df[c].dtype == 'object' or pd.api.types.is_categorical_dtype(df[c]) for c in df.columns)
        
        return {
            "has_financial_columns": has_financial,
            "has_time_series": has_time,
            "has_categorical": has_categorical,
            "has_numeric": has_numeric
        }
    except:
        return {
            "has_financial_columns": False,
            "has_time_series": False,
            "has_categorical": False,
            "has_numeric": False
        }

def _generate_warnings(df):
    """Generate warnings for data issues"""
    warnings = []
    try:
        for col in df.columns:
            if df[col].count() == 0:
                 warnings.append(f"Column {col} is empty")
                 continue
                 
            null_rate = df[col].isnull().mean()
            if null_rate > 0.2:
                warnings.append(f"{int(null_rate*100)}% missing values in {col} column")
    except:
        pass
    return warnings

@app.post("/run/preview", response_model=DatasetIdentity, tags=["Execution"])
async def preview_dataset(file: UploadFile = File(...)):
    """
    Sentry scan: Analyze dataset without running full pipeline.
    Returns Dataset Identity Card for user review.
    """
    file_ext = Path(file.filename).suffix.lower()
    
    # PHASE 2: Gatekeeper - Clear error message for unsupported types
    if file_ext not in ALLOWED_EXTENSIONS:
        allowed_list = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=422,
            detail={
                "error": "unsupported_file_type",
                "message": f"File type '{file_ext}' is not supported",
                "allowed_types": list(ALLOWED_EXTENSIONS),
                "hint": f"Please upload one of: {allowed_list}"
            }
        )

    temp_path = DATA_DIR / f"preview_{uuid.uuid4().hex}{file_ext}"
    
    # OPERATION UNSINKABLE - Layer 2: The Safety Net
    # Global try/except ensures we NEVER return 500 errors
    try:
        # Save uploaded file with encoding fallback
        try:
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except UnicodeDecodeError:
            logger.warning("[SAFETY_NET] UTF-8 decode failed, trying latin-1")
            file.file.seek(0)
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"[PREVIEW] Reading {file_ext} file: {file.filename}")
        
        # Read file based on extension
        try:
            if file_ext == '.csv':
                df = pd.read_csv(temp_path, on_bad_lines='warn', engine='python')
            elif file_ext in {'.tsv', '.txt'}:
                df = pd.read_csv(temp_path, sep='\t', on_bad_lines='warn', engine='python')
            elif file_ext in {'.xls', '.xlsx'}:
                df = pd.read_excel(temp_path)
            elif file_ext == '.parquet':
                df = pd.read_parquet(temp_path)
            elif file_ext == '.json':
                df = pd.read_json(temp_path)
            else:
                df = pd.DataFrame()
        except Exception as read_error:
            logger.error(f"[PREVIEW] File read error: {str(read_error)}")
            # Fallback: Try reading without on_bad_lines for older pandas versions
            if file_ext == '.csv':
                df = pd.read_csv(temp_path)
            elif file_ext in {'.tsv', '.txt'}:
                df = pd.read_csv(temp_path, sep='\t')
            else:
                raise read_error
        
        logger.info(f"[PREVIEW] Successfully read {len(df)} rows, {len(df.columns)} columns")
        
        # Build identity card
        identity = {
            "row_count": len(df),
            "column_count": len(df.columns),
            "file_type": file_ext.replace('.', '').upper(),
            "schema_map": _build_schema_map(df),
            "quality_score": _calculate_quality_score(df),
            "critical_gaps": _detect_gaps(df),
            "detected_capabilities": _detect_capabilities(df),
            "warnings": _generate_warnings(df)
        }
        
        logger.info(f"[PREVIEW] Quality score: {identity['quality_score']:.2f}")
        return identity
        
    except Exception as e:
        # OPERATION UNSINKABLE: Never crash - return Safe Mode instead
        logger.error(f"[SAFETY_NET] Analysis failed, entering Safe Mode: {str(e)}", exc_info=True)
        
        # Return Safe Mode response (200 OK with degraded data)
        return {
            "row_count": 0,
            "column_count": 0,
            "file_type": file_ext.replace('.', '').upper() if file_ext else "UNKNOWN",
            "schema_map": [],
            "quality_score": 0.0,
            "critical_gaps": ["ANALYSIS_FAILED"],
            "detected_capabilities": {},
            "warnings": [
                f"⚠️ Safe Mode: Analysis failed - {str(e)[:200]}",
                "The system could not fully analyze this file.",
                "You can still proceed, but insights will be limited."
            ],
            "status": "limitations",
            "mode": "safe_mode",
            "error_log": str(e)
        }
    finally:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except:
                pass


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
        "service": "ACE V4 API",
        "checks": checks
    }


@app.get("/debug/redis", tags=["System"])
async def debug_redis():
    """Debug endpoint to check Redis connectivity."""
    try:
        redis_url = os.getenv("REDIS_URL")
        has_queue = job_queue is not None
        
        result = {
            "redis_url_set": bool(redis_url),
            "redis_url_prefix": redis_url[:25] if redis_url else None,
            "queue_initialized": has_queue,
        }
        
        if job_queue:
            try:
                # Test Redis connection
                job_queue.redis.ping()
                result["redis_ping"] = "success"
                result["queue_length"] = job_queue.get_queue_length()
            except Exception as e:
                result["redis_ping"] = f"failed: {str(e)}"
        
        return result
        
    except Exception as e:
        logger.exception("[API] Redis debug failed")
        raise HTTPException(status_code=500, detail=str(e))


class RunResponse(BaseModel):
    run_id: str
    message: str
    status: str

@app.post("/run", response_model=RunResponse, tags=["Execution"])
@limiter.limit("10/minute")
async def trigger_run(
    request: Request,
    file: UploadFile = File(...),
    task_intent: str = Form(...),
    confidence_acknowledged: str = Form(...),
    mode: str = Form("full"),  # NEW: Quick View mode support
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
    logger.info(f"[API] POST /run - File: {file.filename}, Mode: {mode}")
    logger.info(f"[API] task_intent received: {task_intent}")
    logger.info(f"[API] confidence_acknowledged received: {confidence_acknowledged}")
    
    # Validate mode parameter
    if mode not in ["full", "summary"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode '{mode}'. Must be 'full' or 'summary'."
        )
    
    try:
        intent_payload = parse_task_intent(task_intent)
    except TaskIntentValidationError as exc:
        detail = str(exc)
        if getattr(exc, 'reformulation', None):
            detail = f"{detail} {exc.reformulation}"
        logger.error(f"[API] Task intent validation failed: {detail}")
        raise HTTPException(status_code=400, detail=detail)

    if _parse_bool(confidence_acknowledged) is not True:
        logger.error("[API] Confidence not acknowledged")
        raise HTTPException(status_code=400, detail="Please acknowledge the confidence threshold (>=80%).")

    _validate_upload(file)

    file_path = _safe_upload_path(file.filename)
    run_config = _build_run_config(
        target_column=target_column,
        feature_whitelist=feature_whitelist,
        model_type=model_type,
        include_categoricals=include_categoricals,
        fast_mode=fast_mode,
    ) or {}
    run_config["task_intent"] = intent_payload
    run_config["confidence_threshold"] = intent_payload.get("confidence_threshold")
    run_config["confidence_acknowledged"] = True
    run_config["mode"] = mode  # Store mode for processing

    try:
        logger.info(f"[API] Saving file to {file_path}")
        bytes_written = 0
        with open(file_path, "wb") as buffer:
            chunk_size = 1024 * 1024
            while chunk := await file.read(chunk_size):
                bytes_written += len(chunk)

                if bytes_written > settings.max_upload_size_bytes:
                    buffer.close()
                    file_path.unlink(missing_ok=True)
                    logger.error(f"[API] File too large: {bytes_written} bytes")
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large (max {settings.max_upload_size_mb}MB)"
                    )

                buffer.write(chunk)

        logger.info(f"[API] File saved: {bytes_written} bytes")
        
        if not job_queue:
            logger.error("[API] Job queue not initialized!")
            raise HTTPException(status_code=503, detail="Job queue unavailable")

        logger.info(f"[API] Enqueueing job...")
        run_id = job_queue.enqueue(str(file_path), run_config=run_config)
        logger.info(f"[API] Job {run_id} enqueued successfully")

        return {
            "run_id": run_id,
            "message": "ACE V3 run queued. A worker will process it shortly.",
            "status": "queued"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[API] Unexpected error in /run endpoint")
        logger.error(f"[API] Error details: {type(e).__name__}: {str(e)}")
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"ACE Execution Failed: {str(e)}")

# REMOVED: Plural route - use /run/{run_id}/status instead
# async def get_progress(run_id: str):
    _validate_run_id(run_id)
    
    if not job_queue:
        raise HTTPException(status_code=503, detail="Job queue unavailable")
    
    job = job_queue.get_job(run_id)
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

@app.get("/run/{run_id}/report", tags=["Artifacts"])
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


@app.get("/run/{run_id}/manifest", tags=["Artifacts"])
async def get_run_manifest(run_id: str):
    """Return the run manifest for a given run."""
    _validate_run_id(run_id)

    run_path = DATA_DIR / "runs" / run_id
    manifest_path = run_path / "run_manifest.json"
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Run manifest not found")

    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read run manifest: {exc}")

# REMOVED: Plural route - use /run/{run_id}/artifacts/{name} if needed
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


@app.get("/run/{run_id}/enhanced-analytics", tags=["Artifacts"])
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


@app.get("/run/{run_id}/summary", tags=["Artifacts"])
async def get_quick_summary(run_id: str):
    """
    Get quick summary data for Quick View mode.
    
    Returns:
        Schema, basic statistics, correlations, and suggested questions
    """
    from core.summary_engine import compute_summary
    
    _validate_run_id(run_id)
    
    run_path = DATA_DIR / "runs" / run_id
    if not run_path.exists():
        raise HTTPException(status_code=404, detail="Run not found")
    
    state = StateManager(str(run_path))
    
    # Check if summary already exists
    existing_summary = state.read("quick_summary")
    if existing_summary:
        logger.info(f"[API] Returning cached summary for {run_id}")
        return existing_summary
    
    # Compute summary from dataset
    try:
        # Find the dataset file
        active_dataset = state.read("active_dataset") or {}
        dataset_path = active_dataset.get("path")
        
        if not dataset_path or not Path(dataset_path).exists():
            raise HTTPException(status_code=404, detail="Dataset not found for this run")
        
        # Read dataset
        logger.info(f"[API] Computing summary for {run_id} from {dataset_path}")
        if str(dataset_path).lower().endswith(".parquet"):
            df = pd.read_parquet(dataset_path)
        elif str(dataset_path).lower().endswith((".csv", ".txt", ".tsv")):
            df = pd.read_csv(dataset_path)
        elif str(dataset_path).lower().endswith((".xlsx", ".xls")):
            df = pd.read_excel(dataset_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Compute summary
        summary = compute_summary(df)
        summary["run_id"] = run_id
        summary["status"] = "completed"
        
        # Store summary for future requests
        state.write("quick_summary", summary)
        logger.info(f"[API] Summary computed and cached for {run_id}")
        
        return summary
        
    except Exception as e:
        logger.error(f"[API] Failed to compute summary for {run_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Summary computation failed: {str(e)}")


# REMOVED: Plural route - evidence system deprecated
async def get_evidence_sample(run_id: str, rows: int = 5):
    """
    Return a small sample of the source dataset (redacted) for evidence inspection.
    """
    _validate_run_id(run_id)
    rows = max(1, min(rows, 10))
    run_path = DATA_DIR / "runs" / run_id
    state = StateManager(str(run_path))

    active = state.read("active_dataset") or {}
    dataset_path = active.get("path")
    if not dataset_path or not Path(dataset_path).exists():
        raise HTTPException(status_code=404, detail="Dataset not found for this run")

    df = None
    try:
        if str(dataset_path).lower().endswith(".parquet"):
            df = pd.read_parquet(dataset_path)
        else:
            df = pd.read_csv(dataset_path, nrows=rows * 2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dataset: {e}")

    # Simple redaction: drop common sensitive columns
    redact_cols = [c for c in df.columns if any(k in c.lower() for k in ["email", "phone", "ssn", "password"])]
    if redact_cols:
        df = df.drop(columns=redact_cols)

    sample = df.head(rows).to_dict(orient="records")
    return {"rows": sample, "row_count": len(sample)}


@app.get("/run/{run_id}/story", tags=["Artifacts"])
async def get_story(run_id: str, tone: str = 'conversational'):
    """Get narrative story for a run.
    
    Args:
        run_id: Unique run identifier
        tone: Narrative tone ('formal' or 'conversational')
    
    Returns:
        Story structure with narrative points, headlines, and visualizations
    """
    _validate_run_id(run_id)
    
    # Validate tone parameter
    if tone not in ['formal', 'conversational']:
        raise HTTPException(
            status_code=400,
            detail="Invalid tone. Must be 'formal' or 'conversational'"
        )
    
    run_path = DATA_DIR / "runs" / run_id
    state = StateManager(str(run_path))
    
    # Check for cached story with this tone
    cache_key = f"story_{tone}"
    cached_story = state.read(cache_key)
    
    if cached_story:
        logger.info(f"Returning cached {tone} story for run {run_id}")
        return cached_story
    
    # Get enhanced analytics and dataset profile
    enhanced_analytics = state.read("enhanced_analytics")
    dataset_identity = state.read("dataset_identity_card")
    
    if not enhanced_analytics:
        raise HTTPException(
            status_code=404,
            detail="Enhanced analytics not available. Run must complete first."
        )
    
    # Generate story
    from core.story_generator import StoryGenerator
    
    generator = StoryGenerator()
    
    try:
        story = generator.generate_story(
            run_id=run_id,
            analytics_data=enhanced_analytics,
            dataset_profile=dataset_identity or {},
            tone=tone
        )
        
        # Cache the story
        state.write(cache_key, story)
        
        logger.info(f"Generated and cached {tone} story for run {run_id}")
        return story
        
    except Exception as e:
        logger.error(f"Failed to generate story for run {run_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate story: {str(e)}"
        )


@app.get("/run/{run_id}/timeline", tags=["Run"])
async def get_timeline_selection(run_id: str):
    """Return the synthetic timeline selection for a run."""
    _validate_run_id(run_id)
    run_path = DATA_DIR / "runs" / run_id
    state = StateManager(str(run_path))
    payload = state.read("synthetic_timeline") or {}
    return {
        'column': payload.get("column"),
        'updated_at': payload.get("updated_at")
    }


@app.post("/run/{run_id}/timeline", tags=["Run"])
async def set_timeline_selection(run_id: str, selection: TimelineSelection):
    """Persist synthetic timeline column selection for a run."""
    _validate_run_id(run_id)
    run_path = DATA_DIR / "runs" / run_id
    state = StateManager(str(run_path))
    record = {"column": selection.column, "updated_at": _iso_now()}
    state.write("synthetic_timeline", record)
    return record

@app.get("/run/{run_id}/diagnostics", tags=["Run"])
async def get_diagnostics(run_id: str):
    """
    Return Safe Mode / validation diagnostics for a run.
    """
    _validate_run_id(run_id)
    run_path = DATA_DIR / "runs" / run_id
    state = StateManager(str(run_path))

    validation = state.read("validation_report") or {}
    identity = _ensure_identity_card(state, run_path)
    confidence = state.read("confidence_report") or {}
    mode = state.read("run_mode") or "strict"
    analysis_intent = state.read("analysis_intent") or {}
    analysis_intent_value = analysis_intent.get("intent") or "exploratory"
    regression_status = state.read("regression_status") or "not_started"
    target_candidate = analysis_intent.get("target_candidate") or {
        "column": None,
        "reason": "no_usable_target_found",
        "confidence": 0.0,
        "detected": False,
    }

    columns = _normalize_columns(identity.get("columns") or identity.get("fields") or {})
    time_tokens = ("date", "time", "day", "week", "month", "quarter", "year", "period", "timestamp")

    def _column_has_time(name: str, meta: dict | None) -> bool:
        label = (name or '').lower()
        dtype = str((meta or {}).get('dtype') or (meta or {}).get('type') or '').lower()
        return any(token in label for token in time_tokens) or any(token in dtype for token in time_tokens)

    has_time = any(_column_has_time(name, meta if isinstance(meta, dict) else None) for name, meta in columns.items())

    reasons = []
    if validation.get("mode") == "limitations":
        reasons.append("Validation: limitations mode")
    if validation.get("target_column") in [None, ""]:
        reasons.append("Validation: missing target column")
    if not has_time:
        reasons.append("Identity: time fields not detected")
    if confidence.get("confidence_label") == "low":
        reasons.append("Confidence: low")

    schema_scan = state.read("schema_scan_output")
    if not isinstance(schema_scan, dict):
        schema_scan = {}
    warnings = state.get_warnings()

    return {
        "mode": mode,
        "validation": validation,
        "identity": identity,
        "confidence": confidence,
        "analysis_intent": analysis_intent_value,
        "target_candidate": target_candidate,
        "reasons": reasons,
        "regression_status": regression_status,
        "warnings": warnings,
        # CRITICAL FIX: Frontend expects data_quality.score here
        "data_quality": {
            "score": schema_scan.get("quality_score", 0.4)
        }
    }

@app.get("/run/{run_id}/identity", tags=["Run"])
async def get_identity_card(run_id: str):
    """Return the dataset identity card and normalized schema profile for a run."""
    _validate_run_id(run_id)
    run_path = DATA_DIR / "runs" / run_id
    state = StateManager(str(run_path))

    identity = _ensure_identity_card(state, run_path)
    if not identity:
        raise HTTPException(status_code=404, detail="Identity card not found")

    columns = _normalize_columns(identity.get("columns") or identity.get("fields") or {})
    numeric_columns = [name for name, meta in columns.items() if _is_numeric_dtype(meta)]

    summary = {
        "row_count": identity.get("row_count"),
        "column_count": identity.get("column_count"),
        "critical_gap_score": identity.get("critical_gap_score"),
        "is_safe_mode": identity.get("is_safe_mode"),
        "drift_status": identity.get("drift_status"),
        "quality": identity.get("quality"),
        "data_type": identity.get("data_type"),
    }

    return {
        "identity": identity,
        "profile": {
            "columns": columns,
            "numericColumns": numeric_columns,
        },
        "summary": summary,
    }


@app.get("/run/{run_id}/model-artifacts", tags=["Artifacts"])
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


# REMOVED: Plural route - evidence system deprecated
async def get_evidence(run_id: str, evidence_id: Optional[str] = None):
    """Expose persisted evidence objects for inspection."""
    _validate_run_id(run_id)
    run_path = DATA_DIR / "runs" / run_id
    state = StateManager(str(run_path))
    registry = state.read("evidence_registry") or {}
    if evidence_id:
        record = registry.get(evidence_id)
        if not record:
            raise HTTPException(status_code=404, detail="Evidence not found")
        return record
    if not registry:
        raise HTTPException(status_code=404, detail="No evidence recorded for this run")
    return {"records": registry}


# REMOVED: Plural route - diff feature not in scope
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


# REMOVED: Plural route - PPTX export deprecated
async def export_pptx(run_id: str):
    """
    Placeholder for PPTX Evidence Deck export.
    """
    raise HTTPException(status_code=501, detail="PPTX export not implemented yet.")
# REMOVED: Plural route - insights available in enhanced-analytics
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


@app.get("/run/{run_id}/status", tags=["History"])
@limiter.limit("60/minute")
async def get_run_state(request: Request, run_id: str):
    """Return orchestrator state for a run.

    Rate limit: 60 requests per minute (allows polling)
    """
    _validate_run_id(run_id)

    run_path = DATA_DIR / "runs" / run_id
    state_path = run_path / "orchestrator_state.json"

    if state_path.exists():
        with open(state_path, "r", encoding="utf-8") as f:
            state = json.load(f)
    else:
        # Fallback: Check Redis Queue (Iron Dome Persistence)
        # This handles cases where Worker and Server are in different containers
        try:
            logger.info(f"[RedisFallback] Attempting to check Redis for {run_id}")
            
            # 1. Fix Import Path
            try:
                sys.path.append(str(Path(__file__).parent.parent))
                from jobs.redis_queue import get_queue
                logger.debug("[RedisFallback] Successfully imported get_queue")
            except ImportError as ie:
                logger.error(f"[RedisFallback] IMPORT ERROR: {ie}")
                raise

            # 2. Connect/Get Queue
            try:
                queue = get_queue()
                if not queue:
                    raise ValueError("get_queue() returned None")
                logger.debug(f"[RedisFallback] Got queue instance: {queue}")
            except Exception as ce:
                logger.error(f"[RedisFallback] CONNECTION ERROR: {ce}")
                raise

            # 3. Fetch Job
            job = queue.get_job(run_id)
            if job:
                # Synthesize state from Redis job data
                logger.info(f"[RedisFallback] SUCCESS. Run {run_id} found in Redis. Status: {job.status}")
                return {
                    "run_id": run_id,
                    "status": job.status,
                    "created_at": job.created_at,
                    "updated_at": job.updated_at,
                    "current_step": "unknown (redis fallback)",
                    "next_step": None,
                    "steps_completed": [],
                    "failed_steps": [],
                    "message": job.message,
                    "progress": 100 if job.status in ["completed", "complete"] else 0,
                    "steps": [] # Frontend handles empty array gracefully
                }
            else:
                 logger.warning(f"[RedisFallback] Job {run_id} NOT FOUND in Redis state hash.")

        except Exception as e:
            logger.error(f"[RedisFallback] CRITICAL FAILURE for {run_id}: {e}", exc_info=True)

        # If we reach here, neither file nor Redis has it
        logger.error(f"[404] State not found for {run_id} (File missing, Redis fallback failed)")
        raise HTTPException(status_code=404, detail=f"State not found for {run_id}")

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

@app.get("/run", tags=["History"])
@app.get("/runs", tags=["History"])  # Compatibility alias
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


@app.post("/api/ask", tags=["Intelligence"])
async def ask_contextual_question(request: AskRequest):
    """
    Answer contextual questions about evidence with grounding.
    Provides reasoning steps and evidence-based responses.
    
    IRON DOME: Never crashes. Returns safe fallback if Gemini unavailable.
    ANTI-WRAPPER: Only responds based on Evidence Object (JSON), not raw data.
    """
    try:
        logger.info(f"[ASK] Query: {request.query[:50]}... | Run: {request.run_id}")
        result = await process_ask_query(request)
        logger.info(f"[ASK] Success - Response generated")
        return JSONResponse(content=result)
    except HTTPException as e:
        logger.warning(f"[ASK] HTTP error: {e.detail}")
        raise e
    except Exception as e:
        # IRON DOME: Log but don't crash
        logger.error(f"[ASK] Unexpected error: {e}", exc_info=True)
        
        # Return safe fallback response
        return JSONResponse(
            status_code=200,  # Don't return 500 - fail open
            content={
                "answer": "I encountered an issue processing your question. Please try rephrasing or contact support.",
                "reasoning_steps": [
                    {"step": "Error encountered", "status": "error"}
                ],
                "evidence_refs": [],
                "confidence": 0.0,
                "error_log": str(e)
            }
        )


# NEURAL PULSE: Server-Sent Events (SSE) Streaming
async def stream_ask_response(request: AskRequest):
    """
    Stream reasoning steps and response tokens in real-time using SSE.
    
    Format: data: {"type": "step", "content": "..."}
    Format: data: {"type": "token", "content": "..."}
    Format: data: {"type": "done", "content": {...}}
    """
    import asyncio
    
    try:
        logger.info(f"[ASK-STREAM] Query: {request.query[:50]}... | Run: {request.run_id}")
        
        # Load evidence
        from api.contextual_intelligence import (
            load_evidence_object,
            generate_reasoning_steps,
            build_evidence_context
        )
        
        evidence = load_evidence_object(request.run_id, request.evidence_type)
        
        if not evidence:
            # Stream error
            payload = {"type": "error", "content": f"Evidence not found for run {request.run_id}"}
            yield f"data: {json.dumps(payload)}\n\n"
            return
        
        # Generate and stream reasoning steps
        steps = generate_reasoning_steps(request.query, request.evidence_type)
        
        for step in steps:
            payload = {"type": "step", "content": step}
            yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(0.3)  # 300ms delay between steps
        
        # Build evidence context
        evidence_context = build_evidence_context(evidence, request.evidence_type)
        
        # Stream thinking indicator
        payload = {"type": "thinking", "content": "Analyzing evidence..."}
        yield f"data: {json.dumps(payload)}\n\n"
        await asyncio.sleep(0.5)
        
        # Generate response using Gemini (if available)
        try:
            from api.gemini_client import generate_strategic_insight, is_gemini_available
            
            if is_gemini_available():
                # Build prompt
                prompt = f"""
You are ACE, an AI data analyst. Answer this question based ONLY on the evidence provided.

Question: {request.query}

Evidence:
{evidence_context}

Rules:
1. ONLY use information from the Evidence section
2. If the evidence doesn't contain the answer, say "I cannot answer that based on the available data"
3. Cite specific numbers from the evidence
4. Be concise and direct
"""
                
                # Generate response
                response_text = generate_strategic_insight(prompt)
                
                # Stream response tokens (simulate streaming by chunking)
                words = response_text.split()
                for i in range(0, len(words), 3):  # Stream 3 words at a time
                    chunk = " ".join(words[i:i+3])
                    payload = {"type": "token", "content": f"{chunk} "}
                    yield f"data: {json.dumps(payload)}\n\n"
                    await asyncio.sleep(0.1)
            else:
                # Fallback template response
                response_text = f"Based on the evidence: {evidence_context[:200]}..."
                payload = {"type": "token", "content": response_text}
                yield f"data: {json.dumps(payload)}\n\n"
        
        except Exception as e:
            logger.error(f"[ASK-STREAM] Gemini error: {e}")
            # Fallback response
            response_text = "I encountered an issue generating a detailed response. Please try rephrasing your question."
            payload = {"type": "token", "content": response_text}
            yield f"data: {json.dumps(payload)}\n\n"
        
        # Stream completion
        payload = {"type": "done", "content": {"status": "complete"}}
        yield f"data: {json.dumps(payload)}\n\n"
        logger.info(f"[ASK-STREAM] Success - Stream completed")
        
    except Exception as e:
        # IRON DOME: Stream error but don't crash
        logger.error(f"[ASK-STREAM] Unexpected error: {e}", exc_info=True)
        payload = {"type": "error", "content": f"An error occurred: {str(e)}"}
        yield f"data: {json.dumps(payload)}\n\n"


@app.post("/api/ask/stream", tags=["Intelligence"])
async def ask_contextual_question_stream(request: AskRequest):
    """
    Stream reasoning steps and response in real-time using Server-Sent Events.
    
    NEURAL PULSE: Streams thinking process visibly.
    IRON DOME: Never crashes, streams errors gracefully.
    ANTI-WRAPPER: Only responds based on Evidence Object (JSON), not raw data.
    """
    return StreamingResponse(
        stream_ask_response(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


class SimulationRequest(BaseModel):
    target_column: str
    modification_factor: float  # e.g., 1.1 for 10% increase


# NEURAL PULSE: Streaming Simulation Progress
async def stream_simulation_progress(run_id: str, request: SimulationRequest):
    """
    Stream simulation progress updates in real-time using SSE.
    
    Format: data: {"type": "progress", "content": "..."}
    Format: data: {"type": "result", "content": {...}}
    """
    import asyncio
    
    try:
        logger.info(f"[SIMULATE-STREAM] Run: {run_id} | Column: {request.target_column} | Factor: {request.modification_factor}")
        
        # Step 1: Initialize
        payload = {"type": "progress", "content": "Initializing simulation engine..."}
        yield f"data: {json.dumps(payload)}\n\n"
        await asyncio.sleep(0.3)
        
        # Initialize simulation engine
        engine = SimulationEngine(run_id)
        
        # Step 2: Load dataset
        payload = {"type": "progress", "content": "Loading original dataset..."}
        yield f"data: {json.dumps(payload)}\n\n"
        await asyncio.sleep(0.3)
        
        df_original = engine.load_dataset()
        
        # Step 3: Clone dataset
        payload = {"type": "progress", "content": "Cloning dataset to RAM (ephemeral copy)..."}
        yield f"data: {json.dumps(payload)}\n\n"
        await asyncio.sleep(0.3)
        
        # Step 4: Apply modification
        modification_pct = (request.modification_factor - 1) * 100
        payload = {
            "type": "progress",
            "content": f"Applying modification: {request.target_column} {modification_pct:+.1f}%...",
        }
        yield f"data: {json.dumps(payload)}\n\n"
        await asyncio.sleep(0.5)
        
        df_simulated = engine.apply_modification(
            df_original,
            request.target_column,
            request.modification_factor
        )
        
        # Step 5: Load original analytics
        payload = {"type": "progress", "content": "Loading baseline analytics..."}
        yield f"data: {json.dumps(payload)}\n\n"
        await asyncio.sleep(0.3)
        
        original_analytics = engine.load_original_analytics()
        
        # Step 6: Re-run analytics
        payload = {"type": "progress", "content": "Re-running churn risk analysis on modified data..."}
        yield f"data: {json.dumps(payload)}\n\n"
        await asyncio.sleep(0.5)
        
        analyzer = EnhancedAnalytics(df_simulated)
        simulated_bi = analyzer.compute_business_intelligence()
        
        # Step 7: Calculate delta
        payload = {"type": "progress", "content": "Calculating delta (before vs after)..."}
        yield f"data: {json.dumps(payload)}\n\n"
        await asyncio.sleep(0.3)
        
        delta = engine.calculate_delta(
            original_analytics.get('business_intelligence', {}),
            simulated_bi
        )
        
        # Step 8: Format result
        if delta.get('churn_risk'):
            delta_value = delta['churn_risk']['delta']
            direction = "decreased" if delta_value < 0 else "increased"
            payload = {
                "type": "progress",
                "content": f"Delta detected: Churn risk {direction} by {abs(delta_value):.1f}%",
            }
            yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(0.3)
        
        # Step 9: Stream final result
        result = {
            "run_id": run_id,
            "modification": {
                "column": request.target_column,
                "factor": request.modification_factor,
                "description": f"{request.target_column} modified by {modification_pct:.1f}%"
            },
            "delta": delta
        }
        
        import json
        payload = {"type": "result", "content": result}
        yield f"data: {json.dumps(payload)}\n\n"
        
        logger.info(f"[SIMULATE-STREAM] Success - Simulation completed")
        
    except FileNotFoundError as e:
        # IRON DOME: Stream error gracefully
        logger.error(f"[SIMULATE-STREAM] File not found: {e}")
        payload = {"type": "error", "content": "Dataset or analytics not found for this run"}
        yield f"data: {json.dumps(payload)}\n\n"
    except ValueError as e:
        # IRON DOME: Stream validation error
        logger.error(f"[SIMULATE-STREAM] Invalid parameter: {e}")
        payload = {"type": "error", "content": str(e)}
        yield f"data: {json.dumps(payload)}\n\n"
    except MemoryError as e:
        # IRON DOME: Safe Mode for RAM overflow
        logger.error(f"[SIMULATE-STREAM] Memory error: {e}")
        payload = {
            "type": "error",
            "content": "Safe Mode: Dataset too large for simulation. Try with a smaller dataset.",
        }
        yield f"data: {json.dumps(payload)}\n\n"
    except Exception as e:
        # IRON DOME: Catch-all fail-open
        logger.error(f"[SIMULATE-STREAM] Unexpected error: {e}", exc_info=True)
        payload = {"type": "error", "content": "Simulation failed. Please check parameters and try again."}
        yield f"data: {json.dumps(payload)}\n\n"


@app.post("/run/{run_id}/simulate/stream", tags=["Intelligence"])
async def simulate_scenario_stream(run_id: str, request: SimulationRequest):
    """
    Stream simulation progress in real-time using Server-Sent Events.
    
    NEURAL PULSE: Streams simulation steps visibly.
    IRON DOME: Never crashes, streams errors gracefully.
    EPHEMERAL: All simulations are RAM-only, never modify original data.
    """
    return StreamingResponse(
        stream_simulation_progress(run_id, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.post("/run/{run_id}/simulate", tags=["Intelligence"])
async def simulate_scenario(run_id: str, request: SimulationRequest):
    """
    Run What-If scenario simulation
    
    Returns delta between original and simulated analytics.
    CONSTRAINT: All simulations are ephemeral (RAM only) - never modify original data.
    """
    try:
        logger.info(f"[SIMULATE] Run: {run_id} | Column: {request.target_column} | Factor: {request.modification_factor}")
        
        # Initialize simulation engine
        engine = SimulationEngine(run_id)
        
        # Load original dataset
        df_original = engine.load_dataset()
        
        # Apply modification (ephemeral copy)
        df_simulated = engine.apply_modification(
            df_original,
            request.target_column,
            request.modification_factor
        )
        
        # Load original analytics
        original_analytics = engine.load_original_analytics()
        
        # Re-run analytics on simulated data
        analyzer = EnhancedAnalytics(df_simulated)
        simulated_bi = analyzer.compute_business_intelligence()
        
        # Calculate delta
        delta = engine.calculate_delta(
            original_analytics.get('business_intelligence', {}),
            simulated_bi
        )
        
        logger.info(f"[SIMULATE] Success - Delta calculated")
        
        return JSONResponse(content={
            "run_id": run_id,
            "modification": {
                "column": request.target_column,
                "factor": request.modification_factor,
                "description": f"{request.target_column} modified by {(request.modification_factor - 1) * 100:.1f}%"
            },
            "delta": delta
        })
        
    except FileNotFoundError as e:
        logger.error(f"[SIMULATE] File not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        logger.error(f"[SIMULATE] Invalid parameter: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # IRON DOME: Log but don't crash
        logger.error(f"[SIMULATE] Unexpected error: {e}", exc_info=True)
        return JSONResponse(
            status_code=200,
            content={
                "error": str(e),
                "message": "Simulation failed. Please check parameters."
            }
        )

# --- Legacy / Alias Routes to fix Frontend 404s ---

@app.get("/run/{run_id}/governed_report", tags=["Report"])
@app.get("/run/{run_id}/artifacts/governed_report", tags=["Report"])
async def get_governed_report(request: Request, run_id: str):
    """Alias for standard report to satisfy frontend request."""
    return await get_report(request, run_id)


# ============================================================================
# PHASE 5: DECISION CAPTURE & SYSTEM INTELLIGENCE
# ============================================================================

# GUARDRAIL 2: Allowed touch types (prevents scope creep)
ALLOWED_TOUCH_TYPES = {
    'action_view',
    'action_click',
    'evidence_expand',
    'trust_inspect',
    'reflection_dismiss'
}

@app.post("/api/decision-touch", tags=["Decision Capture"])
async def create_decision_touch(touch_data: Dict[str, Any]):
    """
    Record a decision interaction (silent tracking).
    
    Phase 5.1: Captures executive interactions with Action Items,
    Supporting Evidence, and Trust signals for contextual memory.
    
    GUARDRAIL 2: Only allowed touch types are accepted.
    """
    try:
        touch_type = touch_data.get('touch_type')
        user_id = touch_data.get('user_id')
        request_id = touch_data.get('run_id')
        
        # GUARDRAIL 2: Validate touch type against whitelist
        if touch_type not in ALLOWED_TOUCH_TYPES:
            logger.warning(f"[DECISION] Rejected unknown touch_type: {touch_type}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid touch_type. Allowed: {', '.join(sorted(ALLOWED_TOUCH_TYPES))}"
            )
        
        # Safety guard must approve before storing
        if not safety_guard:
            logger.error("[DECISION] Safety guard not initialized")
            raise HTTPException(status_code=503, detail="Safety infrastructure not available")

        decision = safety_guard.check_decision_touch(
            touch_type=touch_type,
            user_id=user_id,
            request_id=request_id
        )
        if not decision.allow:
            raise HTTPException(
                status_code=403,
                detail=f"Decision touch blocked: {decision.reason_code}"
            )

        # Create and store
        decision_touch = DecisionTouch(**touch_data)
        # Assuming global dict storage from earlier implementation
        decision_touches[decision_touch.id] = decision_touch
        
        logger.info(f"[DECISION] Captured {touch_type} for run {touch_data.get('run_id')}")
        return {
            "status": "recorded", 
            "id": decision_touch.id, 
            "timestamp": decision_touch.timestamp.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[DECISION] Error capturing touch: {e}")
        return {"status": "error", "message": str(e)}


@app.post("/api/action-outcome", tags=["Decision Capture"])
async def create_action_outcome(outcome_data: Dict[str, Any]):
    """
    Tag the outcome of an action item (optional user input).
    
    Phase 5.2: Allows users to mark how decisions turned out.
    Pure signal collection - no insights, no pressure.
    """
    try:
        status = outcome_data.get('status')
        decision_touch_id = outcome_data.get('decision_touch_id')
        
        # Validate status enum (4 values only)
        ALLOWED_OUTCOME_STATUSES = {'positive', 'neutral', 'negative', 'unknown'}
        if status not in ALLOWED_OUTCOME_STATUSES:
            logger.warning(f"[OUTCOME] Rejected invalid status: {status}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Allowed: {', '.join(sorted(ALLOWED_OUTCOME_STATUSES))}"
            )
        
        if not decision_touch_id:
            raise HTTPException(
                status_code=400,
                detail="decision_touch_id is required - outcomes must link to decision memory"
            )
        
        logger.info(f"[OUTCOME] Marked outcome as {status} for decision {decision_touch_id}")
        return {"status": "recorded", "timestamp": datetime.utcnow().isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[OUTCOME] Error recording outcome: {e}")
        return {"status": "error", "message": str(e)}


@app.get("/api/internal/pattern-monitor", tags=["Internal"])
async def run_pattern_monitor():
    """
    Phase 5.25: Internal trigger for pattern emergence monitor.
    Scans memory for repetitive patterns (N>=3).
    Returns gate status for Phase 5.3.
    """
    from backend.api.decision_models import (
    DecisionTouch, 
    DecisionTouchCreate, 
    ActionOutcome, 
    ActionOutcomeCreate,
    PatternCandidate
)
    from backend.jobs.pattern_monitor import PatternMonitor
    
    # Safety Guard: Check pattern monitor permission for all users
    # Note: For multi-user analysis, we check per user during candidate creation
    # Here we just verify kill switch is not active globally
    if not safety_guard:
        logger.error("[PATTERN_MONITOR] Safety guard not initialized")
        return {
            "status": "error",
            "candidates_found": 0,
            "phase5_3_ready": False,
            "note": "Safety infrastructure not available"
        }
    
    # Quick kill switch check
    if safety_guard.kill_switch_pattern_pause:
        logger.info("[PATTERN_MONITOR] Blocked by kill switch")
        return {
            "status": "paused",
            "candidates_found": 0,
            "phase5_3_ready": False,
            "note": "Kill Switch Active: Pattern Monitor Paused"
        }
    
    # In-memory retrieval (mocking DB fetch)
    # real impl would select * from table
    all_touches = list(decision_touches.values())
    all_outcomes = list(action_outcomes.values())
    
    # Pass safety_guard to monitor for per-user checks
    monitor = PatternMonitor(all_touches, all_outcomes, safety_guard=safety_guard, circuit_breaker=circuit_breaker)
    candidates = monitor.run_analysis()
    
    is_ready = monitor.check_phase5_3_readiness()
    
    return {
        "status": "executed",
        "candidates_found": len(candidates),
        "phase5_3_ready": is_ready,
        "note": "Readiness requires >7 days persistence",
        "debug_touch_count": len(all_touches),
        "debug_outcome_count": len(all_outcomes)
    }


@app.post("/api/internal/generate-reflections", tags=["Internal"])
async def generate_reflections(payload: Dict[str, str]):
    """
    Phase 5.3: Trigger reflection generation for a specific run/user.
    Internal endpoint.
    """
    run_id = payload.get("run_id")
    user_id = payload.get("user_id")
    
    if not run_id or not user_id:
        raise HTTPException(status_code=400, detail="Missing run_id or user_id")
    
    # Safety Guard: Check if reflection generation is allowed
    if not safety_guard:
        logger.error("[REFLECTION_GEN] Safety guard not initialized")
        return {"status": "error", "reason": "Safety infrastructure not available"}
    
    # Kill switch check
    if safety_guard.kill_switch_reflection_off:
        logger.info(f"[REFLECTION_GEN] Blocked by kill switch for user {user_id}")
        return {"status": "none", "reason": "Kill Switch Active: Reflections Disabled"}
    
    from backend.jobs.reflection_generator import ReflectionGenerator
    from backend.api.decision_models import PatternCandidate, Reflection
    
    # 1. Fetch Candidates (In-memory mock)
    # We need to hydrate PatternCandidates from wherever they are stored.
    # For V1, we regenerate them using PatternMonitor on the fly or assume stored?
    # PatternMonitor stores in `candidates` list but it's transient in the job.
    # We will Re-Run Monitor to get fresh candidates.
    from backend.jobs.pattern_monitor import PatternMonitor
    monitor = PatternMonitor(
        list(decision_touches.values()), 
        list(action_outcomes.values()),
        safety_guard=safety_guard,
        circuit_breaker=circuit_breaker
    )
    candidates = monitor.run_analysis()
    
    # 2. Fetch History (In-memory mock)
    # We don't have a `reflections` global dict yet. Let's add it.
    # See below for global add.
    global reflections
    existing_refs = [r for r in reflections.values()]
    
    # 3. Generate (NO hardcoded consent - uses SafetyGuard)
    generator = ReflectionGenerator(
        candidates, 
        existing_refs, 
        safety_guard=safety_guard,
        circuit_breaker=circuit_breaker
    )
    new_reflection = generator.generate(run_id, user_id)
    
    if new_reflection:
        # Safety Guard: Check emission permission
        emission_decision = safety_guard.check_reflection_emission(
            user_id=user_id,
            reflection_id=new_reflection.id,
            request_id=run_id
        )
        
        if not emission_decision.allow:
            logger.info(f"[REFLECTION_GEN] Emission blocked: {emission_decision.reason_code}")
            return {"status": "generated_but_not_emitted", "reason": emission_decision.reason_code}
        
        # Mark as SHOWN immediately (Backend emission = Shown)
        new_reflection.shown_at = datetime.utcnow()
        
        # Record emission in circuit breaker
        circuit_breaker.record_global_reflection_emission()
        
        # Store it
        reflections[new_reflection.id] = new_reflection
        return {"status": "generated", "reflection": new_reflection.dict()}
    
    return {"status": "none", "reason": "No eligible patterns or cooldown active"}


@app.post("/api/internal/assertion-engine", tags=["Internal"])
async def run_assertion_engine(payload: Dict[str, str]):
    """
    Memory Assertion Engine: Autonomous belief formation.
    Converts 30+ day patterns into soft internal beliefs.
    NEVER exposed to users.
    """
    user_id = payload.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id")
    
    from backend.jobs.assertion_engine import AssertionEngine
    from backend.jobs.pattern_monitor import PatternMonitor
    
    # 1. Get fresh patterns
    monitor = PatternMonitor(list(decision_touches.values()), list(action_outcomes.values()))
    candidates = monitor.run_analysis()
    
    # 2. Get reflections and existing assertions
    global memory_assertions, user_memory_states
    all_reflections = list(reflections.values())
    all_assertions = list(memory_assertions.values())
    
    # 3. Run assertion engine
    user_consent = False
    if consent_provider:
        try:
            user_consent = consent_provider.get_consent(user_id)
        except Exception as e:
            logger.error(f"[ASSERTION_ENGINE] ConsentProvider failure: {e}")
            user_consent = False

    engine = AssertionEngine(candidates, all_reflections, all_assertions, user_consent=user_consent)
    
    # Create new assertions
    new_assertions = engine.evaluate_patterns(user_id)
    for assertion in new_assertions:
        memory_assertions[assertion.assertion_id] = assertion
    
    # Check contradictions
    engine.check_contradictions(user_id)
    
    # Apply decay
    deleted_ids = engine.apply_decay(user_id)
    
    # Update memory state
    memory_state = engine.get_memory_state(user_id)
    user_memory_states[user_id] = memory_state
    
    return {
        "status": "executed",
        "new_assertions": len(new_assertions),
        "deleted_assertions": len(deleted_ids),
        "total_assertions": memory_state.assertion_count,
        "memory_state": memory_state.memory_state,
        "note": "Internal only - never exposed to users"
    }


@app.post("/api/internal/reconciliation", tags=["Internal"])
async def run_reconciliation(payload: Dict[str, str]):
    """
    Phase 6: Memory Reconciliation Engine
    Resolves conflicts between beliefs by adjusting confidence.
    NEVER emits user-facing output.
    """
    user_id = payload.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id")
    
    from backend.jobs.reconciliation_engine import ReconciliationEngine
    
    # Get user's assertions
    global memory_assertions, reconciliation_notes, belief_coherence_states
    
    user_assertions = [a for a in memory_assertions.values() if a.user_id == user_id]
    user_notes = [n for n in reconciliation_notes.values() if n.user_id == user_id]
    existing_state = belief_coherence_states.get(user_id)
    
    # Run reconciliation
    engine = ReconciliationEngine(user_assertions, user_notes, existing_state)
    new_state = engine.evaluate_coherence(user_id)
    
    # Store new state
    belief_coherence_states[user_id] = new_state
    
    # Store new notes
    new_notes = engine.get_reconciliation_notes()
    for note in new_notes:
        reconciliation_notes[note.note_id] = note
    
    return {
        "status": "executed",
        "coherence_state": new_state.current_state,
        "assertion_count": new_state.assertion_count,
        "contradiction_count": new_state.contradiction_count,
        "notes_created": len(new_notes),
        "note": "Internal only - never exposed to users"
    }




@app.get("/health")
def health_check():
    """Simple health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    import os
    # Railway provides PORT env var
    port = int(os.getenv("PORT", 8000))
    # Use direct module reference since we're running from project root
    uvicorn.run("backend.api.server:app", host="0.0.0.0", port=port, reload=False)





