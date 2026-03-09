from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Form, Response, BackgroundTasks
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
import logging
import threading
import hashlib
import time
import pandas as pd
from pathlib import Path
from datetime import datetime, timezone
from contextlib import asynccontextmanager
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

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ace.api")

# Global Redis queue instance (initialized on startup)
job_queue: Optional[RedisJobQueue] = None
snapshot_redis = None
snapshot_metrics = {"redis_hit": 0, "memory_hit": 0, "miss": 0}


class SnapshotCache:
    def __init__(self, max_entries: int = 50, ttl_seconds: int = 30):
        self.max_entries = max_entries
        self.ttl_seconds = ttl_seconds
        self._store: Dict[str, Dict[str, Any]] = {}

    def _cleanup(self) -> None:
        now = time.time()
        expired = [key for key, entry in self._store.items() if entry["expires_at"] <= now]
        for key in expired:
            self._store.pop(key, None)
        if len(self._store) <= self.max_entries:
            return
        # Trim oldest entries
        items = sorted(self._store.items(), key=lambda item: item[1]["expires_at"])
        for key, _entry in items[: max(0, len(self._store) - self.max_entries)]:
            self._store.pop(key, None)

    def get(self, key: str, etag: Optional[str]) -> Optional[Dict[str, Any]]:
        self._cleanup()
        entry = self._store.get(key)
        if not entry:
            return None
        if etag and entry.get("etag") != etag:
            return None
        return entry.get("payload")

    def set(self, key: str, payload: Dict[str, Any], etag: str) -> None:
        self._cleanup()
        self._store[key] = {
            "etag": etag,
            "payload": payload,
            "expires_at": time.time() + self.ttl_seconds,
        }


snapshot_cache = SnapshotCache()


def _snapshot_redis_get(key: str) -> tuple[Optional[str], Optional[str]]:
    if snapshot_redis is None:
        return None, None
    try:
        payload = snapshot_redis.get(f"{key}:payload")
        etag = snapshot_redis.get(f"{key}:etag")
        if payload and etag:
            return payload, etag
    except Exception:
        return None, None
    return None, None


def _snapshot_redis_set(key: str, payload: str, etag: str, ttl_seconds: int = 30) -> None:
    if snapshot_redis is None:
        return
    try:
        snapshot_redis.setex(f"{key}:payload", ttl_seconds, payload)
        snapshot_redis.setex(f"{key}:etag", ttl_seconds, etag)
    except Exception:
        return


def _snapshot_etag(run_path: Path, lite: bool) -> str:
    files = [
        run_path / "run_manifest.json",
        run_path / "validation_report.json",
        run_path / "confidence_report.json",
        run_path / "dataset_identity_card.json",
    ]
    if not lite:
        files.extend(
            [
                run_path / "final_report.md",
                run_path / "enhanced_analytics.json",
                run_path / "artifacts" / "governed_report.json",
            ]
        )
    hasher = hashlib.sha1()
    for path in files:
        if not path.exists():
            continue
        stat = path.stat()
        hasher.update(f"{path.name}:{stat.st_mtime_ns}:{stat.st_size}".encode("utf-8"))
    return f"\"{hasher.hexdigest()}\""


def _load_json_file(path: Path) -> Optional[Dict[str, Any]]:
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _build_identity_payload(state: StateManager, run_path: Path) -> Dict[str, Any]:
    identity = _ensure_identity_card(state, run_path)
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


def _build_diagnostics_payload(state: StateManager, run_path: Path) -> Dict[str, Any]:
    validation = state.read("validation_report") or {}
    analytics_validation = state.read("analytics_validation") or {}
    identity = _ensure_identity_card(state, run_path)
    confidence = state.read("confidence_report") or {}
    mode = state.read("run_mode") or "strict"
    analysis_intent = state.read("analysis_intent") or {}
    analysis_intent_value = analysis_intent.get("intent") or "exploratory"
    regression_status = state.read("regression_status") or "not_started"
    run_health = state.read("run_health_summary") or {}
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
    manifest_data = _load_json_file(Path(run_path) / "run_manifest.json") if run_path else {}
    warnings = (manifest_data or {}).get("warnings", [])

    return {
        "mode": mode,
        "validation": validation,
        "analytics_validation": analytics_validation,
        "identity": identity,
        "confidence": confidence,
        "analysis_intent": analysis_intent_value,
        "target_candidate": target_candidate,
        "reasons": reasons,
        "regression_status": regression_status,
        "run_health_summary": run_health,
        "warnings": warnings,
        "data_quality": {
            "score": schema_scan.get("quality_score", 0.4)
        }
    }


def _build_snapshot_payload(run_id: str, lite: bool) -> tuple[Dict[str, Any], str]:
    run_path = DATA_DIR / "runs" / run_id
    state = StateManager(str(run_path))
    manifest = _load_json_file(run_path / "run_manifest.json")
    if not manifest:
        # Manifest may not exist for older runs; build a minimal fallback
        report_exists = (run_path / "final_report.md").exists()
        if not report_exists and not any(run_path.iterdir()):
            raise FileNotFoundError("Run not found or not yet complete")
        manifest = {"steps": {}, "artifacts": {}, "warnings": [], "trust": None,
                    "render_policy": {"allow_report": report_exists}, "view_policies": {}}

    diagnostics = _build_diagnostics_payload(state, run_path)
    identity_payload = _build_identity_payload(state, run_path)
    curated_kpis = {
        "rows": identity_payload.get("summary", {}).get("row_count"),
        "columns": identity_payload.get("summary", {}).get("column_count"),
        "data_quality_score": diagnostics.get("data_quality", {}).get("score")
            or identity_payload.get("identity", {}).get("quality_score"),
        "completeness": identity_payload.get("summary", {}).get("quality", {}).get("avg_null_pct"),
    }

    payload: Dict[str, Any] = {
        "run_id": run_id,
        "generated_at": _iso_now(),
        "lite": lite,
        "manifest": manifest,
        "diagnostics": diagnostics,
        "identity": identity_payload,
        "curated_kpis": curated_kpis,
        "render_policy": manifest.get("render_policy"),
        "view_policies": manifest.get("view_policies"),
        "trust": manifest.get("trust"),
        "run_warnings": manifest.get("warnings"),
    }

    if not lite:
        report_path = run_path / "final_report.md"
        payload["report_markdown"] = report_path.read_text(encoding="utf-8") if report_path.exists() else ""
        governed_report = _load_json_file(run_path / "artifacts" / "governed_report.json")
        if governed_report:
            payload["governed_report"] = governed_report
            payload["evidence_map"] = governed_report.get("evidence") or {}
        else:
            payload["governed_report"] = None
            payload["evidence_map"] = {}
        payload["enhanced_analytics"] = state.read("enhanced_analytics") or None
        payload["model_artifacts"] = {
            "importance_report": state.read("importance_report"),
            "regression_coefficients_report": state.read("regression_coefficients_report"),
            "baseline_metrics": state.read("baseline_metrics"),
            "model_fit_report": state.read("model_fit_report"),
            "collinearity_report": state.read("collinearity_report"),
            "leakage_report": state.read("leakage_report"),
            "feature_governance_report": state.read("feature_governance_report"),
            "feature_importance": (state.read("regression_insights") or {}).get("feature_importance")
                or (state.read("enhanced_analytics") or {}).get("feature_importance"),
            "coefficients": (state.read("regression_insights") or {}).get("coefficients")
                or (state.read("enhanced_analytics") or {}).get("coefficients"),
            "shap_explanations": state.read("shap_explanations"),
            "onnx_export": state.read("onnx_export"),
            "drift_report": state.read("drift_report"),
        }
        # LLM-generated smart narrative
        payload["smart_narrative"] = state.read("smart_narrative") or None

        # Interpretation layer artifacts
        payload["deep_insights"] = state.read("deep_insights") or _load_json_file(run_path / "artifacts" / "deep_insights.json")
        payload["hypotheses"] = state.read("hypotheses") or _load_json_file(run_path / "artifacts" / "hypotheses.json")
        payload["executive_narrative"] = state.read("executive_narrative") or _load_json_file(run_path / "artifacts" / "executive_narrative.json")

    etag = _snapshot_etag(run_path, lite)
    return payload, etag

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
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+",
    allow_origins=settings.allowed_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)


async def _initialize_app():
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
        
        global snapshot_redis
        snapshot_redis = job_queue.redis if job_queue and getattr(job_queue, 'redis', None) else None
        
        # Start background worker thread
        logger.info("[API] Starting background worker thread...")
        from jobs.worker import worker_loop
        worker_thread = threading.Thread(target=worker_loop, daemon=True, name="ACE-Worker")
        worker_thread.start()
        logger.info("[API] ✅ Background worker started successfully")

        # Start job cleanup thread for stuck/orphaned jobs
        from jobs.redis_queue import start_cleanup_thread
        start_cleanup_thread(job_queue)
        logger.info("[API] ✅ Job cleanup thread started")
        
    except Exception as e:
        logger.exception("[API] ❌ CRITICAL: Failed to initialize Redis queue or worker")
        logger.error(f"[API] Error: {e}")
        logger.error("[API] Job queue will not be available - /run endpoint will return 503")
        # Don't raise - let app start but /run will return 503

    # Pre-warm snapshot cache with recent runs (lite payloads)
    try:
        def _prewarm():
            runs_dir = DATA_DIR / "runs"
            if not runs_dir.exists():
                return
            run_dirs = sorted(
                [p for p in runs_dir.iterdir() if p.is_dir()],
                key=lambda p: p.stat().st_mtime,
                reverse=True,
            )
            for run_path in run_dirs[:10]:
                run_id = run_path.name
                try:
                    payload, etag = _build_snapshot_payload(run_id, lite=True)
                    snapshot_cache.set(f"{run_id}:lite", payload, etag)
                    _snapshot_redis_set(f"{run_id}:lite", json.dumps(payload), etag)
                except Exception:
                    continue
        threading.Thread(target=_prewarm, daemon=True, name="ACE-Snapshot-Prewarm").start()
    except Exception:
        logger.warning("[API] Snapshot cache prewarm failed")

@asynccontextmanager
async def lifespan(app: FastAPI):
    await _initialize_app()
    yield


app.router.lifespan_context = lifespan

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
    return datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


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
    sheets: List[str] = []


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
async def preview_dataset(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(None),
):
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
        sheet_names: List[str] = []
        try:
            if file_ext == '.csv':
                df = pd.read_csv(temp_path, on_bad_lines='warn', engine='python')
            elif file_ext in {'.tsv', '.txt'}:
                df = pd.read_csv(temp_path, sep='\t', on_bad_lines='warn', engine='python')
            elif file_ext in {'.xls', '.xlsx'}:
                xl = pd.ExcelFile(temp_path)
                sheet_names = xl.sheet_names
                _sheet = sheet_name if sheet_name and sheet_name in sheet_names else sheet_names[0]
                logger.info(f"[PREVIEW] Excel sheets: {sheet_names}. Reading: '{_sheet}'")
                df = xl.parse(_sheet)
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
            "warnings": _generate_warnings(df),
            "sheets": sheet_names,
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
    sheet_name: Optional[str] = None,
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

    if sheet_name:
        config["sheet_name"] = sheet_name

    return config or None


def convert_markdown_to_pdf(markdown_path: Path, pdf_path: Path, artifacts_dir: Path = None):
    """Convert markdown file to PDF with styling and embedded charts."""
    try:
        import markdown as md
        from weasyprint import HTML
        import base64
        import re

        # Read markdown
        with open(markdown_path, 'r', encoding='utf-8') as f:
            md_content = f.read()

        # Resolve artifacts directory for chart images
        if artifacts_dir is None:
            artifacts_dir = markdown_path.parent / "artifacts"

        # Convert relative image paths to base64 data URIs for PDF embedding
        def embed_image(match):
            alt_text = match.group(1)
            img_path = match.group(2)

            # Resolve the image path relative to artifacts directory
            if img_path.startswith("charts/"):
                full_path = artifacts_dir / img_path
            else:
                full_path = artifacts_dir / "charts" / img_path

            if full_path.exists():
                try:
                    with open(full_path, "rb") as img_file:
                        img_data = base64.b64encode(img_file.read()).decode("utf-8")
                    suffix = full_path.suffix.lower()
                    mime = "image/png" if suffix == ".png" else "image/svg+xml" if suffix == ".svg" else "image/jpeg"
                    return f"![{alt_text}](data:{mime};base64,{img_data})"
                except Exception:
                    pass
            return match.group(0)  # Return original if image not found

        # Replace markdown image references with base64 data URIs
        md_content = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', embed_image, md_content)

        # Convert to HTML
        html_content = md.markdown(md_content, extensions=['tables', 'fenced_code'])

        # Add styling for better PDF formatting with chart support
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
        /* Chart image styling */
        img {{ max-width: 100%; height: auto; margin: 20px 0; display: block; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        p > img {{ margin: 20px auto; }}
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


@app.get("/debug/snapshot-cache", tags=["System"])
async def debug_snapshot_cache():
    """Debug endpoint to check snapshot cache health."""
    redis_ok = False
    if snapshot_redis is not None:
        try:
            snapshot_redis.ping()
            redis_ok = True
        except Exception:
            redis_ok = False
    return {
        "redis_available": snapshot_redis is not None,
        "redis_ping": "success" if redis_ok else "failed",
        "metrics": snapshot_metrics,
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
async def trigger_run(
    file: UploadFile = File(...),
    target_column: Optional[str] = Form(None),
    feature_whitelist: Optional[str] = Form(None),
    model_type: Optional[str] = Form(None),
    include_categoricals: Optional[str] = Form(None),
    fast_mode: Optional[str] = Form(None),
    sheet_name: Optional[str] = Form(None),
):
    """
    Upload a data file and enqueue a full ACE V3 run for background processing.
    Returns the Run ID (job identifier).

    Accepts: CSV, JSON, XLSX, XLS, Parquet files (max configured size)
    """
    _validate_upload(file)

    file_path = _safe_upload_path(file.filename)
    run_config = _build_run_config(
        target_column=target_column,
        feature_whitelist=feature_whitelist,
        model_type=model_type,
        include_categoricals=include_categoricals,
        fast_mode=fast_mode,
        sheet_name=sheet_name,
    )

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

@app.get("/run/{run_id}/snapshot", tags=["Artifacts"])
@limiter.limit("30/minute")
async def get_snapshot(request: Request, run_id: str, lite: bool = False):
    """Return the full snapshot payload for a completed run."""
    _validate_run_id(run_id)
    try:
        payload, etag = _build_snapshot_payload(run_id, lite=lite)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found or not yet complete")
    return JSONResponse(content=payload, headers={"ETag": etag})


@app.post("/run/{run_id}/ask", tags=["Artifacts"])
@limiter.limit("10/minute")
async def ask_about_run(request: Request, run_id: str):
    """Insight Lens: ask an AI question about a completed analysis run.

    Supports two modes:
    - Default: returns JSON response
    - stream=true: returns Server-Sent Events for progressive rendering
    """
    _validate_run_id(run_id)

    body = await request.json()
    question = body.get("question", "").strip()
    active_tab = body.get("active_tab", "summary")
    stream = body.get("stream", False)

    if not question:
        raise HTTPException(status_code=400, detail="Question is required")
    if len(question) > 1000:
        raise HTTPException(status_code=400, detail="Question too long (max 1000 chars)")

    from core.insight_lens import load_lens_context, ask_insight_lens, ask_insight_lens_stream

    # Lazy-load only the sections needed for this tab (much faster than full snapshot)
    run_path = str(DATA_DIR / "runs" / run_id)
    try:
        context_data = load_lens_context(run_path, active_tab)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found or not yet complete")

    if stream:
        from starlette.responses import StreamingResponse
        return StreamingResponse(
            ask_insight_lens_stream(question, context_data, active_tab),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    try:
        result = ask_insight_lens(question, context_data, active_tab)
    except Exception as e:
        logger.error(f"Insight Lens error for run {run_id}: {e}")
        result = {
            "answer": "Unable to analyze right now. The AI service may be temporarily unavailable.",
            "evidence": [],
        }

    return JSONResponse(content=result)


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
        artifacts_dir = run_path / "artifacts"

        # Generate PDF if it doesn't exist or if markdown is newer
        if not pdf_path.exists() or pdf_path.stat().st_mtime < report_path.stat().st_mtime:
            convert_markdown_to_pdf(report_path, pdf_path, artifacts_dir)
        
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


# --- Legacy / Alias Routes to fix Frontend 404s ---

@app.get("/run/{run_id}/governed_report", tags=["Report"])
@app.get("/run/{run_id}/artifacts/governed_report", tags=["Report"])
async def get_governed_report(request: Request, run_id: str):
    """Alias for standard report to satisfy frontend request."""
    return await get_report(request, run_id)


@app.get("/run/{run_id}/charts/{filename}", tags=["Artifacts"])
async def get_chart_image(run_id: str, filename: str):
    """Serve chart images generated during report creation.

    Args:
        run_id: The run identifier
        filename: Chart filename (e.g., feature_importance.png)

    Returns:
        FileResponse with the chart image
    """
    _validate_run_id(run_id)

    # Validate filename to prevent path traversal
    if not re.match(r'^[a-zA-Z0-9_-]+\.(png|svg|jpg|jpeg)$', filename, re.IGNORECASE):
        raise HTTPException(status_code=400, detail="Invalid chart filename")

    chart_path = DATA_DIR / "runs" / run_id / "artifacts" / "charts" / filename

    if not chart_path.exists():
        raise HTTPException(status_code=404, detail="Chart not found")

    # Determine media type
    suffix = chart_path.suffix.lower()
    media_types = {
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }
    media_type = media_types.get(suffix, "application/octet-stream")

    return FileResponse(chart_path, media_type=media_type)


@app.get("/run/{run_id}/charts", tags=["Artifacts"])
async def list_charts(run_id: str):
    """List all available charts for a run.

    Args:
        run_id: The run identifier

    Returns:
        List of chart filenames and metadata
    """
    _validate_run_id(run_id)

    charts_dir = DATA_DIR / "runs" / run_id / "artifacts" / "charts"

    if not charts_dir.exists():
        return {"charts": [], "count": 0}

    charts = []
    for chart_file in charts_dir.iterdir():
        if chart_file.is_file() and chart_file.suffix.lower() in {".png", ".svg", ".jpg", ".jpeg"}:
            charts.append({
                "filename": chart_file.name,
                "url": f"/run/{run_id}/charts/{chart_file.name}",
                "size_bytes": chart_file.stat().st_size,
            })

    return {"charts": charts, "count": len(charts)}


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
        return {"status": "recorded", "timestamp": datetime.now(timezone.utc).isoformat()}
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
        new_reflection.shown_at = datetime.now(timezone.utc)
        
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


# ============================================================================
# USER CONFIGURATIONS
# ============================================================================

from pydantic import BaseModel
from typing import Optional, List as PydanticList

class ConfigCreateRequest(BaseModel):
    name: str
    description: str = ""
    target_column: Optional[str] = None
    feature_whitelist: Optional[PydanticList[str]] = None
    model_type: Optional[str] = None
    fast_mode: bool = False
    include_categoricals: bool = False
    primary_question: Optional[str] = None
    required_output_type: Optional[str] = None
    confidence_threshold: float = 0.8
    tags: PydanticList[str] = []


class ConfigUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_column: Optional[str] = None
    feature_whitelist: Optional[PydanticList[str]] = None
    model_type: Optional[str] = None
    fast_mode: Optional[bool] = None
    include_categoricals: Optional[bool] = None
    primary_question: Optional[str] = None
    required_output_type: Optional[str] = None
    confidence_threshold: Optional[float] = None
    tags: Optional[PydanticList[str]] = None


@app.get("/configs", tags=["Configurations"])
async def list_configs(tags: Optional[str] = None):
    """List all saved analysis configurations."""
    from core.user_config import get_config_store, AnalysisConfig

    store = get_config_store()
    tag_list = tags.split(",") if tags else None
    configs = store.list(tags=tag_list)

    return {
        "configs": [c.to_dict() for c in configs],
        "total": len(configs),
    }


@app.post("/configs", tags=["Configurations"])
async def create_config(request: ConfigCreateRequest):
    """Create a new saved configuration."""
    from core.user_config import get_config_store, AnalysisConfig

    store = get_config_store()
    config = AnalysisConfig(
        id="",  # Will be generated
        name=request.name,
        description=request.description,
        target_column=request.target_column,
        feature_whitelist=request.feature_whitelist,
        model_type=request.model_type,
        fast_mode=request.fast_mode,
        include_categoricals=request.include_categoricals,
        primary_question=request.primary_question,
        required_output_type=request.required_output_type,
        confidence_threshold=request.confidence_threshold,
        tags=request.tags,
    )
    saved = store.create(config)
    return saved.to_dict()


@app.get("/configs/{config_id}", tags=["Configurations"])
async def get_config(config_id: str):
    """Get a specific configuration by ID."""
    from core.user_config import get_config_store

    store = get_config_store()
    config = store.get(config_id)

    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    return config.to_dict()


@app.put("/configs/{config_id}", tags=["Configurations"])
async def update_config(config_id: str, request: ConfigUpdateRequest):
    """Update an existing configuration."""
    from core.user_config import get_config_store

    store = get_config_store()
    updates = {k: v for k, v in request.dict().items() if v is not None}

    config = store.update(config_id, updates)
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    return config.to_dict()


@app.delete("/configs/{config_id}", tags=["Configurations"])
async def delete_config(config_id: str):
    """Delete a configuration."""
    from core.user_config import get_config_store

    store = get_config_store()
    if not store.delete(config_id):
        raise HTTPException(status_code=404, detail="Configuration not found")

    return {"status": "deleted", "id": config_id}


@app.get("/configs/{config_id}/run-config", tags=["Configurations"])
async def get_run_config(config_id: str):
    """Get the run_config format for a saved configuration.

    This can be used directly when starting a new analysis run.
    """
    from core.user_config import get_config_store

    store = get_config_store()
    config = store.get(config_id)

    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    return {
        "config_id": config_id,
        "config_name": config.name,
        "run_config": config.to_run_config(),
    }


# ============================================================================
# RUN COMPARISON
# ============================================================================

@app.post("/compare-runs", tags=["Analysis"])
async def compare_runs_endpoint(run_ids: PydanticList[str]):
    """Compare multiple runs side-by-side.

    Provide a list of run IDs to compare their metrics, features, and results.
    """
    if len(run_ids) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 run IDs to compare")
    if len(run_ids) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 runs can be compared at once")

    from core.run_comparison import compare_runs

    # Load snapshot data for each run
    run_data = []
    for run_id in run_ids:
        try:
            _validate_run_id(run_id)
            run_path = DATA_DIR / "runs" / run_id
            state = StateManager(str(run_path))

            # Build minimal snapshot for comparison
            snapshot = {
                "model_artifacts": {
                    "model_fit_report": state.read("model_fit_report"),
                    "importance_report": state.read("importance_report"),
                },
                "diagnostics": state.read("diagnostics") or {},
                "identity": {"identity": state.read("dataset_identity") or state.read("identity")},
            }

            run_data.append({
                "run_id": run_id,
                "snapshot": snapshot,
            })
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found: {e}")

    comparison = compare_runs(run_data)
    return comparison


# ============================================================================
# SCHEDULED RUNS
# ============================================================================

class ScheduleCreateRequest(BaseModel):
    """Request model for creating a scheduled run."""
    name: str
    description: str = ""
    enabled: bool = True
    frequency: str = "daily"  # hourly, daily, weekly, monthly
    hour: int = 0  # Hour of day (0-23)
    day_of_week: int = 0  # Day of week (0=Monday) for weekly
    day_of_month: int = 1  # Day of month (1-28) for monthly
    dataset_path: Optional[str] = None
    dataset_url: Optional[str] = None
    config_id: Optional[str] = None
    target_column: Optional[str] = None
    model_type: Optional[str] = None
    fast_mode: bool = True
    notify_on_complete: bool = False
    notify_email: Optional[str] = None
    webhook_url: Optional[str] = None


class ScheduleUpdateRequest(BaseModel):
    """Request model for updating a scheduled run."""
    name: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None
    frequency: Optional[str] = None
    hour: Optional[int] = None
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None
    dataset_path: Optional[str] = None
    dataset_url: Optional[str] = None
    config_id: Optional[str] = None
    target_column: Optional[str] = None
    model_type: Optional[str] = None
    fast_mode: Optional[bool] = None
    notify_on_complete: Optional[bool] = None
    notify_email: Optional[str] = None
    webhook_url: Optional[str] = None


@app.get("/schedules", tags=["Scheduling"])
async def list_schedules(enabled_only: bool = False):
    """List all scheduled runs.

    Args:
        enabled_only: If true, only return enabled schedules
    """
    from core.scheduler import get_scheduler_store

    store = get_scheduler_store()
    schedules = store.list(enabled_only=enabled_only)

    return {
        "schedules": [s.to_dict() for s in schedules],
        "total": len(schedules),
    }


@app.post("/schedules", tags=["Scheduling"])
async def create_schedule(request: ScheduleCreateRequest):
    """Create a new scheduled run."""
    from core.scheduler import get_scheduler_store, ScheduledRun

    # Validate frequency
    valid_frequencies = ["hourly", "daily", "weekly", "monthly"]
    if request.frequency not in valid_frequencies:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid frequency. Must be one of: {', '.join(valid_frequencies)}"
        )

    # Validate hour
    if not 0 <= request.hour <= 23:
        raise HTTPException(status_code=400, detail="Hour must be between 0 and 23")

    # Validate day_of_week for weekly
    if request.frequency == "weekly" and not 0 <= request.day_of_week <= 6:
        raise HTTPException(status_code=400, detail="day_of_week must be between 0 (Monday) and 6 (Sunday)")

    # Validate day_of_month for monthly
    if request.frequency == "monthly" and not 1 <= request.day_of_month <= 28:
        raise HTTPException(status_code=400, detail="day_of_month must be between 1 and 28")

    store = get_scheduler_store()
    schedule = ScheduledRun(
        id="",  # Will be generated
        name=request.name,
        description=request.description,
        enabled=request.enabled,
        frequency=request.frequency,
        hour=request.hour,
        day_of_week=request.day_of_week,
        day_of_month=request.day_of_month,
        dataset_path=request.dataset_path,
        dataset_url=request.dataset_url,
        config_id=request.config_id,
        target_column=request.target_column,
        model_type=request.model_type,
        fast_mode=request.fast_mode,
        notify_on_complete=request.notify_on_complete,
        notify_email=request.notify_email,
        webhook_url=request.webhook_url,
    )

    created = store.create(schedule)
    return created.to_dict()


@app.get("/schedules/{schedule_id}", tags=["Scheduling"])
async def get_schedule(schedule_id: str):
    """Get a scheduled run by ID."""
    from core.scheduler import get_scheduler_store

    store = get_scheduler_store()
    schedule = store.get(schedule_id)

    if not schedule:
        raise HTTPException(status_code=404, detail=f"Schedule '{schedule_id}' not found")

    result = schedule.to_dict()
    result["next_run"] = schedule.get_next_run_time()
    return result


@app.put("/schedules/{schedule_id}", tags=["Scheduling"])
async def update_schedule(schedule_id: str, request: ScheduleUpdateRequest):
    """Update a scheduled run."""
    from core.scheduler import get_scheduler_store

    store = get_scheduler_store()
    schedule = store.get(schedule_id)

    if not schedule:
        raise HTTPException(status_code=404, detail=f"Schedule '{schedule_id}' not found")

    # Build updates dict from non-None values
    updates = {k: v for k, v in request.model_dump().items() if v is not None}

    # Validate frequency if provided
    if "frequency" in updates:
        valid_frequencies = ["hourly", "daily", "weekly", "monthly"]
        if updates["frequency"] not in valid_frequencies:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid frequency. Must be one of: {', '.join(valid_frequencies)}"
            )

    # Validate hour if provided
    if "hour" in updates and not 0 <= updates["hour"] <= 23:
        raise HTTPException(status_code=400, detail="Hour must be between 0 and 23")

    updated = store.update(schedule_id, updates)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update schedule")

    result = updated.to_dict()
    result["next_run"] = updated.get_next_run_time()
    return result


@app.delete("/schedules/{schedule_id}", tags=["Scheduling"])
async def delete_schedule(schedule_id: str):
    """Delete a scheduled run."""
    from core.scheduler import get_scheduler_store

    store = get_scheduler_store()
    deleted = store.delete(schedule_id)

    if not deleted:
        raise HTTPException(status_code=404, detail=f"Schedule '{schedule_id}' not found")

    return {"deleted": True, "schedule_id": schedule_id}


@app.post("/schedules/{schedule_id}/trigger", tags=["Scheduling"])
async def trigger_schedule(schedule_id: str, background_tasks: BackgroundTasks):
    """Manually trigger a scheduled run.

    Starts an analysis run using the schedule's configuration.
    """
    from core.scheduler import get_scheduler_store

    store = get_scheduler_store()
    schedule = store.get(schedule_id)

    if not schedule:
        raise HTTPException(status_code=404, detail=f"Schedule '{schedule_id}' not found")

    # Check if dataset is configured
    if not schedule.dataset_path and not schedule.dataset_url:
        raise HTTPException(
            status_code=400,
            detail="Schedule has no dataset configured (dataset_path or dataset_url required)"
        )

    # Generate run ID
    run_id = str(uuid.uuid4())
    run_path = DATA_DIR / "runs" / run_id
    run_path.mkdir(parents=True, exist_ok=True)

    # Copy dataset if local path
    if schedule.dataset_path:
        source_path = Path(schedule.dataset_path)
        if not source_path.exists():
            raise HTTPException(status_code=400, detail=f"Dataset not found: {schedule.dataset_path}")

        dest_path = run_path / source_path.name
        import shutil
        shutil.copy2(source_path, dest_path)
        dataset_file = dest_path
    else:
        # For URL-based datasets, we'd need to download first
        raise HTTPException(status_code=501, detail="URL-based scheduled runs not yet implemented")

    # Build run config from schedule
    run_config = schedule.to_run_config()

    # Initialize state
    state = StateManager(str(run_path))
    state.write("status", "queued")
    state.write("run_config", run_config)
    state.write("run_id", run_id)

    # Launch pipeline in background
    background_tasks.add_task(run_analysis, run_id, str(dataset_file), run_config, state)

    # Record this run
    store.record_run(schedule_id, run_id, "started")

    return {
        "triggered": True,
        "schedule_id": schedule_id,
        "run_id": run_id,
        "dataset": str(dataset_file),
    }


@app.get("/schedules/due", tags=["Scheduling"])
async def get_due_schedules():
    """Get schedules that are due to run now.

    This endpoint is designed to be called by an external cron job
    to check which schedules need to be triggered.
    """
    from core.scheduler import get_scheduler_store

    store = get_scheduler_store()
    due = store.get_due_schedules()

    return {
        "due_schedules": [s.to_dict() for s in due],
        "count": len(due),
    }


if __name__ == "__main__":
    import uvicorn
    import os
    # Railway provides PORT env var
    port = int(os.getenv("PORT", 8000))
    # Use direct module reference since we're running from project root
    uvicorn.run("backend.api.server:app", host="0.0.0.0", port=port, reload=False)




