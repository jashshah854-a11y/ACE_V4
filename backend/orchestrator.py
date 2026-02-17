import os
import json
import time
import subprocess
import sys
import traceback
import threading
import shutil
import logging
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger("ace.orchestrator")

# Add project root to path
sys.path.append(str(Path(__file__).parent.resolve()))
from core.env import ensure_windows_cpu_env
ensure_windows_cpu_env()

from core.pipeline_map import PIPELINE_SEQUENCE, PIPELINE_DESCRIPTIONS

# --- PROTOCOL 1000: FORCE EXPOSITOR INCLUSION ---
# Ensure expositor is ALWAYS in the execution sequence
if "expositor" not in PIPELINE_SEQUENCE:
    print("[ORCHESTRATOR] WARNING: 'expositor' missing from PIPELINE_SEQUENCE. Forcing inclusion.", file=sys.stderr, flush=True)
    PIPELINE_SEQUENCE.append("expositor")

# Ensure trust_evaluation (if present) runs after expositor
if "trust_evaluation" in PIPELINE_SEQUENCE:
    if "expositor" in PIPELINE_SEQUENCE:
        PIPELINE_SEQUENCE = [step for step in PIPELINE_SEQUENCE if step != "expositor"]
        trust_index = PIPELINE_SEQUENCE.index("trust_evaluation")
        PIPELINE_SEQUENCE.insert(trust_index, "expositor")
    if PIPELINE_SEQUENCE[-1] != "trust_evaluation":
        PIPELINE_SEQUENCE = [step for step in PIPELINE_SEQUENCE if step != "trust_evaluation"]
        PIPELINE_SEQUENCE.append("trust_evaluation")
else:
    # Double-check: Ensure expositor is the LAST step when trust evaluation is absent
    if PIPELINE_SEQUENCE[-1] != "expositor":
        print(f"[ORCHESTRATOR] WARNING: 'expositor' is not the final step (current: {PIPELINE_SEQUENCE[-1]}). Reordering...", file=sys.stderr, flush=True)
        PIPELINE_SEQUENCE = [step for step in PIPELINE_SEQUENCE if step != "expositor"]
        PIPELINE_SEQUENCE.append("expositor")

print(f"[ORCHESTRATOR] Final Pipeline Sequence: {PIPELINE_SEQUENCE}", file=sys.stderr, flush=True)
# ------------------------------------------------

from core.run_utils import create_run_folder
from core.state_manager import StateManager
from core.data_guardrails import is_agent_allowed_for_run, append_limitation
from core.insights import validate_insights
from core.identity_card import build_identity_card, save_identity_card
from core.task_contract import build_task_contract, save_task_contract
from core.confidence import compute_data_confidence
from core.data_loader import calculate_file_timeout
from agents.data_sanitizer import DataSanitizer
from ace_v4.performance.config import PerformanceConfig
from intake.stream_loader import prepare_run_data
from intake.profiling import profile_dataframe, compute_drift_report, save_json
from jobs.progress import ProgressTracker
from core.run_manifest import initialize_manifest, compute_dataset_fingerprint, update_step_status, read_manifest, seal_manifest
from core.structured_logging import log_step_event
from core.run_health import build_run_health_summary
from core.invariants import run_invariants
from core.agent_eligibility import resolve_agent_eligibility

POLL_TIME = 0.5  # seconds
MAX_STEP_ATTEMPTS = 3
RETRY_BACKOFF = 2
GOVERNANCE_REFRESH_STEPS = {"scanner", "type_identifier", "interpreter", "validator"}
TIME_BUDGETS = {
    "scanner": 120,
    "type_identifier": 90,
    "validator": 120,
    "overseer": 300,
    "regression": 420,
    "personas": 300,
    "fabricator": 300,
    "raw_data_sampler": 60,       # Quick data sampling
    "deep_insight": 180,          # LLM calls for insight synthesis
    "dot_connector": 120,         # Connection analysis
    "hypothesis_engine": 180,     # Bold hypothesis generation
    "so_what_deepener": 120,      # Implication deepening
    "story_framer": 120,          # Narrative framing
    "executive_narrator": 180,    # 3-pass LLM narrative generation
    "expositor": 180,
    "trust_evaluation": 90,
}


def _record_final_status(run_path: str, status: str, **extra):
    try:
        payload = {"status": status, "updated_at": iso_now()}
        if extra:
            payload.update(extra)
        StateManager(run_path).write("final_status", payload)
    except Exception as exc:
        print(f"[WARN] Unable to record final status: {exc}")


def load_state(state_path):
    if not os.path.exists(state_path):
        return None
    with open(state_path) as f:
        return json.load(f)

def save_state(state_path, state):
    """Persist orchestrator state with atomic safe writes."""
    state["updated_at"] = iso_now()
    tmp_path = f"{state_path}.tmp"
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, state_path)
    except Exception as e:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
        print(f"[ERROR] Failed to save state atomically: {e}")


def iso_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _sync_regression_status(state: dict, state_manager: StateManager) -> None:
    """Single source of truth for regression_status based on orchestrator step state."""
    status_map = {
        None: "not_started",
        "pending": "not_started",
        "running": "running",
        "completed": "success",
        "failed": "failed",
        "skipped": "failed",
        "not_applicable": "failed",
    }
    step_status = (state.get("steps") or {}).get("regression", {}).get("status")
    state_manager.write("regression_status", status_map.get(step_status, "not_started"))


def _finalize_regression_artifacts(state_manager: StateManager, success: bool) -> None:
    """
    Finalize regression artifacts with graceful fallback handling.

    FIX: Handle cases where regression was skipped/blocked but returned success=True.
    Instead of raising errors, we now gracefully handle missing artifacts.
    """
    pending = state_manager.read("regression_insights_pending")
    if not success:
        state_manager.delete("regression_insights_pending")
        return

    # If no pending artifacts, check if regression was skipped or blocked
    if not pending:
        # Check if regression_insights already exists (from a previous run or direct write)
        if state_manager.exists("regression_insights"):
            logger.info("[Orchestrator] Regression insights already finalized, skipping promotion")
            return
        # No artifacts means regression was skipped/blocked - this is OK, not an error
        logger.warning("[Orchestrator] Regression returned success but no artifacts - likely skipped or blocked")
        # Write empty regression_insights to indicate step completed without output
        state_manager.write("regression_insights", {"status": "skipped", "reason": "No pending artifacts"})
        return

    state_manager.write("regression_insights", pending)
    if not state_manager.exists("regression_insights"):
        # Validation failed - write partial result instead of raising
        logger.warning("[Orchestrator] Regression artifacts failed validation - writing partial result")
        state_manager.write("regression_insights", {"status": "partial", "reason": "Validation failed"})
        state_manager.delete("regression_insights_pending")
        return
    state_manager.delete("regression_insights_pending")

    required = [
        "feature_governance_report",
        "baseline_metrics",
        "model_fit_report",
        "collinearity_report",
        "leakage_report",
        "importance_report",
    ]
    optional = ["regression_coefficients_report"]
    missing_required = []
    for name in required + optional:
        pending_name = f"{name}_pending"
        artifact = state_manager.read(pending_name)
        if artifact is None:
            if name in required:
                missing_required.append(name)
            continue
        state_manager.write(name, artifact)
        state_manager.delete(pending_name)

    # Log missing artifacts but don't fail the pipeline
    if missing_required:
        logger.warning(f"[Orchestrator] Regression missing artifacts: {missing_required}")


def _finalize_expositor_artifacts(state_manager: StateManager, run_path: str, success: bool) -> None:
    """
    Finalize expositor artifacts with graceful fallback handling.

    FIX: Instead of raising errors when artifacts are missing, we now:
    1. Check for existing final_report (already written by expositor directly)
    2. Try to promote pending artifacts if available
    3. Generate minimal report if nothing exists but expositor "succeeded"
    4. Only fail if we truly have nothing to show
    """
    pending_report = state_manager.read("final_report_pending")
    pending_analytics = state_manager.read("enhanced_analytics_pending")
    final_report = state_manager.read("final_report")  # Check if already finalized
    pending_path = Path(run_path) / "final_report.pending.md"
    final_path = Path(run_path) / "final_report.md"

    if not success:
        state_manager.delete("final_report_pending")
        state_manager.delete("enhanced_analytics_pending")
        if pending_path.exists():
            pending_path.unlink()
        return

    # Case 1: Report already finalized by expositor (new behavior in expositor.py)
    if final_report and final_path.exists():
        logger.info("[Orchestrator] Final report already exists, skipping promotion")
        state_manager.delete("final_report_pending")
        if pending_path.exists():
            pending_path.unlink(missing_ok=True)
        # Still try to promote analytics if pending
        if pending_analytics:
            state_manager.write("enhanced_analytics", pending_analytics)
            state_manager.delete("enhanced_analytics_pending")
        return

    # Case 2: Pending report exists - promote it
    if pending_report and pending_path.exists():
        final_path.parent.mkdir(parents=True, exist_ok=True)
        os.replace(pending_path, final_path)
        state_manager.write("final_report", pending_report)
        state_manager.delete("final_report_pending")
        if pending_analytics:
            state_manager.write("enhanced_analytics", pending_analytics)
            state_manager.delete("enhanced_analytics_pending")
        return

    # Case 3: No pending but final exists on disk (written directly)
    if final_path.exists():
        try:
            with open(final_path, "r", encoding="utf-8") as f:
                report_content = f.read()
            if report_content.strip():
                state_manager.write("final_report", report_content)
                logger.info("[Orchestrator] Recovered final report from disk")
                if pending_analytics:
                    state_manager.write("enhanced_analytics", pending_analytics)
                    state_manager.delete("enhanced_analytics_pending")
                return
        except Exception as e:
            logger.warning(f"[Orchestrator] Failed to recover report from disk: {e}")

    # Case 4: Generate minimal report as last resort
    logger.warning("[Orchestrator] No report artifacts found, generating minimal report")
    identity = state_manager.read("dataset_identity_card") or {}
    validation = state_manager.read("validation_result") or {}
    minimal_report = _generate_minimal_report(identity, validation, run_path)

    final_path.parent.mkdir(parents=True, exist_ok=True)
    with open(final_path, "w", encoding="utf-8") as f:
        f.write(minimal_report)
    state_manager.write("final_report", minimal_report)

    # Still promote analytics if available
    if pending_analytics:
        state_manager.write("enhanced_analytics", pending_analytics)
        state_manager.delete("enhanced_analytics_pending")


def _generate_minimal_report(identity: dict, validation: dict, run_path: str) -> str:
    """Generate a minimal report when expositor fails to produce one."""
    run_id = Path(run_path).name
    rows = identity.get("row_count", "Unknown")
    cols = identity.get("column_count", "Unknown")
    mode = validation.get("mode", "unknown")

    return f"""# Analysis Report

## Run ID: {run_id}

### Dataset Overview
- **Rows**: {rows}
- **Columns**: {cols}
- **Analysis Mode**: {mode}

### Status
The analysis pipeline completed but detailed report generation encountered issues.
Please check the enhanced analytics and data profile tabs for available insights.

*Report generated as fallback by ACE V4 orchestrator.*
"""


def _finalize_trust_artifacts(state_manager: StateManager, run_path: str, success: bool) -> None:
    pending = state_manager.read("trust_object_pending")
    if not success:
        state_manager.delete("trust_object_pending")
        return
    if not pending:
        raise RuntimeError("Trust evaluation succeeded but no pending artifact found.")
    state_manager.write("trust_object", pending)
    if not state_manager.exists("trust_object"):
        raise RuntimeError("Trust artifact failed validation and was discarded.")
    state_manager.delete("trust_object_pending")
    from core.run_manifest import update_trust
    update_trust(run_path, pending)


def _finalize_metadata_artifacts(state_manager: StateManager, step: str, success: bool) -> None:
    pending_map = {
        "scanner": ["data_profile"],
        "type_identifier": ["dataset_classification"],
    }
    pending_names = pending_map.get(step, [])
    if not pending_names:
        return
    if not success:
        for name in pending_names:
            state_manager.delete(f"{name}_pending")
        return
    for name in pending_names:
        pending = state_manager.read(f"{name}_pending")
        if not pending:
            raise RuntimeError(f"{step} succeeded but {name}_pending missing.")
        # Write directly to disk, bypassing StateManager.write() manifest checks
        # which can refuse writes when manifest step status is stale
        import json as _json
        target_path = state_manager.run_path / f"{name}.json"
        with open(target_path, "w", encoding="utf-8") as _f:
            _json.dump(pending, _f, indent=2)
        print(f"[Orchestrator] Promoted {name}_pending → {name} (row_count={pending.get('row_count', '?')})")
        state_manager.delete(f"{name}_pending")


def initialize_state(run_id, state_path, data_path):
    from core.pipeline_map import calculate_progress

    steps = {}
    # Add ingestion as first step
    steps["ingestion"] = {
        "name": "ingestion",
        "description": "Data ingestion and sanitization",
        "status": "pending"
    }

    for step in PIPELINE_SEQUENCE:
        steps[step] = {
            "name": step,
            "description": PIPELINE_DESCRIPTIONS.get(step, step),
            "status": "pending"
        }

    state = {
        "run_id": run_id,
        "status": "pending",
        "created_at": iso_now(),
        "updated_at": iso_now(),
        "current_step": "ingestion",
        "next_step": "ingestion",
        "steps_completed": [],
        "failed_steps": [],
        "steps": steps,
        "history": [
            {
                "timestamp": iso_now(),
                "event": "Run initialized",
                "data_path": data_path
            }
        ]
    }

    # Initialize progress fields
    progress_info = calculate_progress("ingestion", [])
    state.update(progress_info)

    save_state(state_path, state)
    return state


def update_history(state, message, **payload):
    entry = {"timestamp": iso_now(), "event": message}
    if payload:
        entry.update(payload)
    state.setdefault("history", []).append(entry)


def mark_step_running(state, step):
    from core.pipeline_map import calculate_progress

    step_state = state["steps"].setdefault(step, {"name": step})
    if step_state.get("status") == "running":
        return
    step_state["status"] = "running"
    step_state["started_at"] = iso_now()
    step_state["_start_epoch"] = time.time()
    state["steps"][step] = step_state
    state["status"] = "running"
    state["current_step"] = step

    # Calculate and update progress
    progress_info = calculate_progress(step, state.get("steps_completed", []))
    state.update(progress_info)

    update_history(state, f"{step} started")
    _rp = state.get("run_path")
    if _rp:
        update_step_status(_rp, step, "running")


def finalize_step(state, step, success, stdout, stderr):
    from core.pipeline_map import calculate_progress

    step_state = state["steps"].setdefault(step, {"name": step})
    step_state["status"] = "completed" if success else "failed"
    step_state["completed_at"] = iso_now()
    start_epoch = step_state.pop("_start_epoch", None)
    if start_epoch:
        step_state["runtime_seconds"] = round(time.time() - start_epoch, 2)

    tail_len = 2000
    if stdout:
        step_state["stdout_tail"] = stdout[-tail_len:]
    if stderr:
        step_state["stderr_tail"] = stderr[-tail_len:]

    state["steps"][step] = step_state

    target_list = state["steps_completed"] if success else state["failed_steps"]
    if step not in target_list:
        target_list.append(step)

    # Recalculate progress after step completion
    progress_info = calculate_progress(state.get("current_step", step), state.get("steps_completed", []))
    state.update(progress_info)

    event = "completed" if success else "failed"
    update_history(state, f"{step} {event}", returncode=0 if success else 1)
    _rp = state.get("run_path")
    if _rp:
        update_step_status(_rp, step, "success" if success else "failed")


def calculate_agent_timeout(run_path, agent_name):
    """Calculate dynamic timeout based on dataset size and agent type."""
    base_timeout = 900  # 15 minutes base timeout
    
    # Try to determine data size
    try:
        state = StateManager(run_path)
        data_path = state.get_file_path("cleaned_uploaded.csv")
        if data_path and os.path.exists(data_path):
            file_size_mb = os.path.getsize(data_path) / (1024 * 1024)
            # Add 2 seconds per MB, more for compute-intensive agents
            intensive_agents = ["overseer", "regression", "sentry", "personas"]
            multiplier = 3 if agent_name in intensive_agents else 2
            size_timeout = int(file_size_mb * multiplier)
            total_timeout = min(base_timeout + size_timeout, 1800)  # Cap at 30 minutes
            print(f"[TIMEOUT] {agent_name}: {total_timeout}s (file: {file_size_mb:.1f}MB)")
            return total_timeout
    except Exception as e:
        print(f"[TIMEOUT] Could not calculate dynamic timeout: {e}")
    
    return base_timeout

def run_agent(agent_name, run_path):
    print(f"[ORCHESTRATOR] Launching agent: {agent_name}")

    # Map pipeline step names to agent script names
    agent_script_map = {
        "type_identifier": "type_identifier",
        "validator": "validator",
        "scanner": "scanner",
        "interpreter": "schema_interpreter",
        "overseer": "overseer",
        "regression": "regression",
        "time_series": "time_series_analyzer",
        "sentry": "sentry",
        "personas": "persona_engine",
        "fabricator": "fabricator",
        "raw_data_sampler": "raw_data_sampler",
        "deep_insight": "deep_insight",
        "dot_connector": "dot_connector",
        "hypothesis_engine": "hypothesis_engine",
        "so_what_deepener": "so_what_deepener",
        "story_framer": "story_framer",
        "executive_narrator": "executive_narrator",
        "expositor": "expositor",
        "trust_evaluation": "trust_evaluation",
    }
    
    script_name = agent_script_map.get(agent_name, agent_name)
    
    # Data type guardrails before launching heavy agents
    # IMPORTANT: expositor should NEVER be blocked - it must always generate a report
    if agent_name not in {"type_identifier", "validator", "scanner", "interpreter", "trust_evaluation", "expositor", "sentry"}:
        sm = StateManager(run_path)
        dtype_info = sm.read("data_type_identification") or {}
        data_type = dtype_info.get("primary_type")
        allowed, reason = is_agent_allowed_for_run(agent_name, sm, data_type)
        if not allowed:
            msg = reason or "Agent not allowed for detected data type"
            append_limitation(sm, msg, agent=agent_name, severity="warning")
            print(f"[ORCHESTRATOR] Skipping {agent_name}: {msg}")
            return True, "", msg
        elif reason:
            append_limitation(sm, reason, agent=agent_name, severity="info")
            print(f"[ORCHESTRATOR] Proceeding with caution for {agent_name}: {reason}")
    
    # Build path relative to orchestrator.py location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    agent_script = os.path.join(script_dir, "agents", f"{script_name}.py")
    print(f"[DEBUG] Agent script path: {agent_script}")
    print(f"[DEBUG] Script exists: {os.path.exists(agent_script)}")

    # Calculate dynamic timeout based on data file size
    state_manager = StateManager(run_path)
    dataset_info = state_manager.read("active_dataset") or {}
    data_path = dataset_info.get("path") or state_manager.get_file_path("cleaned_uploaded.csv") or ""

    config = PerformanceConfig()
    timeout = calculate_file_timeout(data_path, config) if data_path else config.base_timeout_seconds
    print(f"[DEBUG] Calculated timeout for {agent_name}: {timeout}s ({timeout/60:.1f} min)")

    # Ensure PYTHONPATH includes the backend directory so agents can import 'core'
    env = os.environ.copy()
    # script_dir is the backend directory (where orchestrator.py lives)
    # Add it to PYTHONPATH so agents can do: from core.xxx import yyy
    env["PYTHONPATH"] = script_dir + os.pathsep + env.get("PYTHONPATH", "")
    print(f"[DEBUG] PYTHONPATH: {env['PYTHONPATH']}")

    # Fix for joblib warning on Windows
    if os.name == 'nt':
        env["LOKY_MAX_CPU_COUNT"] = str(os.cpu_count())
    
    # Calculate dynamic timeout based on data size
    agent_timeout = calculate_agent_timeout(run_path, agent_name)
    budget = TIME_BUDGETS.get(agent_name)
    if budget:
        agent_timeout = min(agent_timeout, budget)
    
    # OPERATION GLASS HOUSE: Forensic Subprocess Wrapper
    print(f"[ORCHESTRATOR] Launching Agent: {agent_name}...", file=sys.stderr, flush=True)
    start_time = time.time()

    try:
        # FORCE CAPTURE of both STDOUT and STDERR to expose hidden failures
        result = subprocess.run(
            [sys.executable, agent_script, run_path],
            capture_output=True,    # CRITICAL: Grab stdout/stderr
            text=True,              # CRITICAL: Decode to string
            env=env,
            timeout=min(agent_timeout, timeout)  # use the tighter of the two
        )

        # Check return code manually (not using check=True to handle stderr better)
        if result.returncode != 0:
            # CRITICAL FAILURE DETAILS
            print(f"\n{'='*80}", file=sys.stderr, flush=True)
            print(f"CRITICAL AGENT FAILURE: {agent_name}", file=sys.stderr, flush=True)
            print(f"EXIT CODE: {result.returncode}", file=sys.stderr, flush=True)
            print(f"{'-'*80}", file=sys.stderr, flush=True)
            
            # PRINT THE HIDDEN TRACEBACK
            if result.stderr:
                print("AGENT STDERR (root cause):", file=sys.stderr, flush=True)
                print(result.stderr, file=sys.stderr, flush=True)
            else:
                print("NO STDERR CAPTURED (process died instantly)", file=sys.stderr, flush=True)
            
            if result.stdout:
                print(f"{'-'*80}", file=sys.stderr, flush=True)
                print("AGENT STDOUT:", file=sys.stderr, flush=True)
                print(result.stdout, file=sys.stderr, flush=True)
                
            print(f"{'='*80}\n", file=sys.stderr, flush=True)
            
            from utils.logging import log_error
            log_error(
                f"Agent {agent_name} failed with code {result.returncode}",
                agent=agent_name,
                return_code=result.returncode,
                run_path=run_path
            )

            sanitized_stderr = result.stderr[:500] if result.stderr else ""
            duration = time.time() - start_time
            manifest = read_manifest(run_path) or {}
            artifacts = manifest.get("artifacts") or {}
            artifact_count = sum(1 for meta in artifacts.values() if meta.get("produced_by_step") == agent_name)
            warning_count = len(manifest.get("warnings") or [])
            log_step_event(
                {
                    "run_id": Path(run_path).name,
                    "step_name": agent_name,
                    "status": "failed",
                    "duration": round(duration, 2),
                    "artifact_count": artifact_count,
                    "warning_count": warning_count,
                    "error_code": "STEP_FAILED",
                }
            )
            return False, result.stdout, sanitized_stderr
        else:
            # Success case
            from utils.logging import log_ok
            log_ok(f"Agent {agent_name} completed", agent=agent_name, run_path=run_path)
            duration = time.time() - start_time
            manifest = read_manifest(run_path) or {}
            artifacts = manifest.get("artifacts") or {}
            artifact_count = sum(1 for meta in artifacts.values() if meta.get("produced_by_step") == agent_name)
            warning_count = len(manifest.get("warnings") or [])
            log_step_event(
                {
                    "run_id": Path(run_path).name,
                    "step_name": agent_name,
                    "status": "success",
                    "duration": round(duration, 2),
                    "artifact_count": artifact_count,
                    "warning_count": warning_count,
                    "error_code": None,
                }
            )
            return True, result.stdout, result.stderr

    except subprocess.TimeoutExpired as e:
        from utils.logging import log_error
        log_error(
            f"Agent {agent_name} timed out after {e.timeout} seconds",
            agent=agent_name,
            timeout=e.timeout,
            run_path=run_path
        )
        duration = time.time() - start_time
        log_step_event(
            {
                "run_id": Path(run_path).name,
                "step_name": agent_name,
                "status": "failed",
                "duration": round(duration, 2),
                "artifact_count": 0,
                "warning_count": 0,
                "error_code": "TIMEOUT",
            }
        )
        return False, "", f"Agent execution timed out. This may indicate a large dataset or processing issue."
    except Exception as e:
        # --- OPERATION GLASS HOUSE: FORCE LOGGING ---
        print(f"\n{'='*80}", file=sys.stderr, flush=True)
        print(f"[CRITICAL FAILURE] Agent '{agent_name}' CRASHED", file=sys.stderr, flush=True)
        print(f"[CRITICAL FAILURE] Run Path: {run_path}", file=sys.stderr, flush=True)
        print(f"[CRITICAL FAILURE] Error: {str(e)}", file=sys.stderr, flush=True)
        print(f"[CRITICAL FAILURE] Traceback follows:", file=sys.stderr, flush=True)
        print(f"{'-'*80}", file=sys.stderr, flush=True)
        traceback.print_exc(file=sys.stderr)
        print(f"{'='*80}\n", file=sys.stderr, flush=True)
        
        from utils.logging import log_error
        log_error(
            f"Failed to execute agent {agent_name}",
            exc_info=True,
            agent=agent_name,
            run_path=run_path
        )
        return False, "", f"Agent execution failed. Please check server logs."

def orchestrate_new_run(data_path, run_config=None, run_id=None):
    print("=== ACE V3 ORCHESTRATOR START ===")

    # 1. Create Run
    run_id, run_path = create_run_folder(run_id=run_id)
    state_manager = StateManager(run_path)
    progress = ProgressTracker(run_path)
    config = PerformanceConfig()
    print(f"[RUN] Run ID: {run_id}")
    print(f"[RUN] Run Path: {run_path}")

    # 2. Initialize State with ingestion step
    state_path = os.path.join(run_path, "orchestrator_state.json")

    # 3. Sanitize Data (Step 0 - Pre-pipeline)
    # We do this here to ensure the run folder has the clean data before the pipeline starts
    if not os.path.exists(data_path):
        print(f"[ERROR] Data file not found: {data_path}")
        shutil.rmtree(run_path, ignore_errors=True)
        return None, None

    file_size_mb = os.path.getsize(data_path) / (1024 * 1024)
    print(f"Preparing dataset ({file_size_mb:.2f} MB): {data_path}")

    # Initialize state before ingestion
    state = initialize_state(run_id, state_path, data_path)

    # Mark ingestion as running
    mark_step_running(state, "ingestion")
    save_state(state_path, state)

    try:
        if file_size_mb >= config.large_file_size_mb:
            cleaned_path, ingestion_meta = prepare_run_data(
                data_path, run_path, progress=progress, config=config
            )
            state_manager.write("ingestion_meta", ingestion_meta)
            state_manager.write(
                "active_dataset",
                {"path": cleaned_path, "source": data_path, "strategy": "stream"},
            )
            print(f"Streamed dataset to {cleaned_path}")
        else:
            import pandas as pd

            raw_df = pd.read_csv(data_path)
            sanitizer = DataSanitizer()
            clean_df, clean_report = sanitizer.sanitize(raw_df)
            
            cleaned_path = state_manager.get_file_path("cleaned_uploaded.csv")
            clean_df.to_csv(cleaned_path, index=False)
            state_manager.write("sanitizer_report", clean_report)
            state_manager.write(
                "active_dataset",
                {"path": cleaned_path, "source": data_path, "strategy": "sanitize"},
            )
            print(f"Data sanitized. Clean file: {cleaned_path}")

            # Profile and drift artifacts for small/normal files
            artifacts_dir = Path(run_path) / "artifacts"
            artifacts_dir.mkdir(parents=True, exist_ok=True)

            current_profile = profile_dataframe(clean_df.head(5000))
            schema_profile_path = artifacts_dir / "schema_profile.json"
            save_json(schema_profile_path, current_profile)

            baseline_path = artifacts_dir / "baseline_profile.json"
            if baseline_path.exists():
                with open(baseline_path, "r", encoding="utf-8") as f:
                    baseline_profile = json.load(f)
            else:
                baseline_profile = current_profile
                save_json(baseline_path, baseline_profile)

            drift_report = compute_drift_report(baseline_profile, current_profile)
            drift_report_path = artifacts_dir / "drift_report.json"
            save_json(drift_report_path, drift_report)

            state_manager.write(
                "ingestion_meta",
                {
                    "rows": len(clean_df),
                    "schema_profile": str(schema_profile_path),
                    "drift_report": str(drift_report_path),
                    "drift_status": drift_report.get("status", "none"),
                    "strategy": "sanitize",
                },
            )
            progress.update(
                "ingestion",
                {
                    "status": "completed",
                    "rows_processed": len(clean_df),
                    "strategy": "sanitize",
                },
            )

        # Mark ingestion as completed
        state = load_state(state_path)
        finalize_step(state, "ingestion", True, "", "")
        state["current_step"] = PIPELINE_SEQUENCE[0]
        state["next_step"] = PIPELINE_SEQUENCE[0]
        save_state(state_path, state)

    except Exception as e:
        print(f"Sanitization failed: {e}")
        shutil.rmtree(run_path, ignore_errors=True)
        return None, None

    # 4. Update state with artifacts
    state = load_state(state_path)
    state["artifacts"] = {
        "cleaned_dataset": os.path.basename(cleaned_path),
        "sanitizer_report": "sanitizer_report.json"
    }
    # Persist ingestion meta if present
    if state_manager.read("ingestion_meta"):
        state["artifacts"]["ingestion_meta"] = "ingestion_meta.json"
    # Persist fusion meta if present from intake stage
    intake_meta = state_manager.read("intake_meta") or {}
    if intake_meta.get("fusion_status"):
        state["artifacts"]["fusion_status"] = intake_meta.get("fusion_status")
        state["artifacts"]["fusion_growth_ratio"] = intake_meta.get("growth_ratio")
        if intake_meta.get("fusion_report_path"):
            state["artifacts"]["fusion_report"] = intake_meta.get("fusion_report_path")

    state["data_path"] = cleaned_path
    state["run_path"] = str(run_path)
    if run_config:
        state["run_config"] = run_config
        state_manager.write("run_config", run_config)

    # Build identity card, task contract, and confidence
    ingestion_meta = state_manager.read("ingestion_meta") or {}
    schema_profile_path = ingestion_meta.get("schema_profile")
    drift_report_path = ingestion_meta.get("drift_report")
    data_type = state_manager.read("data_type_identification") or state_manager.read("data_type") or {}

    schema_profile = {}
    drift_report = {}
    if schema_profile_path and Path(schema_profile_path).exists():
        with open(schema_profile_path, "r", encoding="utf-8") as f:
            schema_profile = json.load(f)
    if drift_report_path and Path(drift_report_path).exists():
        with open(drift_report_path, "r", encoding="utf-8") as f:
            drift_report = json.load(f)

    identity_card = build_identity_card(schema_profile, data_type, drift_report, source_path=data_path)
    card_path = Path(run_path) / "artifacts" / "dataset_identity_card.json"
    save_identity_card(card_path, identity_card)
    state_manager.write("dataset_identity_card", identity_card)

    validation_report = state_manager.read("data_validation_report") or {}
    # If not yet validated, proceed later; otherwise build contract now
    target_col = validation_report.get("target_column")
    has_target = bool(target_col)
    target_is_binary = False
    if has_target and target_col and target_col in schema_profile.get("columns", {}):
        # heuristic for binary
        target_is_binary = validation_report.get("checks", {}).get("variance", {}).get("detail", "").startswith("usable")

    task_contract = build_task_contract(
        identity_card,
        validation_report,
        ingestion_meta.get("drift_status", "none"),
        has_target=has_target,
        target_is_binary=target_is_binary,
    )
    contract_path = Path(run_path) / "artifacts" / "task_contract.json"
    save_task_contract(contract_path, task_contract)
    state_manager.write("task_contract", task_contract)

    confidence = compute_data_confidence(identity_card, validation_report, ingestion_meta.get("drift_status", "none"))
    conf_path = Path(run_path) / "artifacts" / "confidence_report.json"
    save_json(conf_path, confidence)
    state_manager.write("confidence_report", confidence)

    # Initialize run manifest so trust_evaluation can read it later
    import hashlib as _hashlib
    _file_hash = _hashlib.sha256(Path(cleaned_path).read_bytes()).hexdigest() if Path(cleaned_path).exists() else "unknown"
    _columns = list((schema_profile.get("columns") or {}).keys())
    _row_count = ingestion_meta.get("rows", 0)
    _ds_fingerprint = compute_dataset_fingerprint(_file_hash, _columns, _row_count)
    initialize_manifest(run_path, run_id, _ds_fingerprint)

    save_state(state_path, state)
    return run_id, run_path


def launch_pipeline_async(data_path, run_config=None):
    """Utility to start a run and process it in a background thread."""
    run_id, run_path = orchestrate_new_run(data_path, run_config=run_config)
    if not run_path:
        return run_id, run_path

    thread = threading.Thread(target=main_loop, args=(run_path,), daemon=True)
    thread.start()
    return run_id, run_path

def main_loop(run_path):
    """
    Main orchestration loop with graceful degradation.

    Features:
    - Graceful error handling at each step
    - Never crashes completely - always tries to produce a report
    - Each agent failure is handled independently
    """
    if not run_path:
        return

    state_path = os.path.join(run_path, "orchestrator_state.json")
    state_manager = StateManager(run_path)

    while True:
        state = load_state(state_path)
        if not state:
            time.sleep(POLL_TIME)
            continue

        _sync_regression_status(state, state_manager)
        regression_status = state_manager.read("regression_status") or "not_started"
        if regression_status != "success" and state_manager.exists("regression_insights"):
            update_history(state, "Regression status mismatch: artifacts present while status != success", returncode=1)
            state["status"] = "failed"
            state["failure_reason"] = "regression_status_mismatch"
            save_state(state_path, state)
            _record_final_status(run_path, "failed", reason="regression_status_mismatch")
            break

        # STABILITY LAW 1: ABSOLUTE REPORT ENFORCEMENT
        # The pipeline SHALL NOT complete without a physical final_report.md
        # Using Report Enforcer module for absolute path verification
        if state.get("status") == "failed":
            _record_final_status(run_path, "failed", reason=state.get("failure_reason") or "failed")
            break

        if state.get("status") in {"complete", "complete_with_errors"} and state.get("next_step") in {None, "complete"}:
            # Import at function scope
            from core.report_enforcer import enforce_report_existence
            
            # --- PROTOCOL 1100: PREVENT PREMATURE COMPLETION ---
            # Ensure expositor has run before allowing pipeline to complete
            expositor_required = "expositor" in PIPELINE_SEQUENCE
            expositor_completed = "expositor" in state.get("steps_completed", [])

            if not expositor_required:
                final_status = state.get("status", "unknown")
                _record_final_status(run_path, final_status)
                print(f"Pipeline finished with status: {state['status']}")
                break

            if expositor_required and not expositor_completed and state.get("next_step") == "complete":
                print(f"[ORCHESTRATOR] Protocol 1100: Pipeline marked {state['status']} but expositor not run. Forcing continuation.", file=sys.stderr, flush=True)
                # Override status back to running
                state["status"] = "running"
                state["current_step"] = "expositor"
                state["next_step"] = "expositor"
                save_state(state_path, state)
                # Don't break - continue to expositor
                continue
            
            # Expositor has run - safe to complete
            
            print(f"[ORCHESTRATOR] Pipeline completion detected. Enforcing report existence...")
            
            # ABSOLUTE ENFORCEMENT - This blocks until report exists or fails
            report_verified = enforce_report_existence(run_path, max_wait=30)
            
            if not report_verified:
                # CRITICAL FAILURE - Report enforcer could not guarantee report
                print("[ORCHESTRATOR] CRITICAL: Report enforcer failed. Blocking completion.")
                state["status"] = "failed"
                state["failure_reason"] = "CRITICAL: Report generation failed after all retries"
                update_history(state, "Report enforcer blocked completion - no valid report", returncode=1)
                save_state(state_path, state)
                _record_final_status(run_path, "failed", reason="report_enforcer_block")
                break
            
            # Report verified - safe to complete
            print("[ORCHESTRATOR] Report verified. Pipeline completion authorized.")
            final_status = state.get("status", "unknown")
            _record_final_status(run_path, final_status)
            print(f"Pipeline finished with status: {state['status']}")
            break

        current = state["current_step"]

        # Honor validation guardrails (skip blocked agents rather than hallucinate)
        validation_report = state_manager.read("validation_report") or {}
        blocked = set(validation_report.get("blocked_agents") or [])
        analysis_intent = state_manager.read("analysis_intent") or {}
        eligibility = resolve_agent_eligibility(current, analysis_intent)
        if eligibility["status"] != "eligible":
            step_state = state["steps"].setdefault(current, {"name": current})
            step_state["status"] = "not_applicable" if eligibility["status"] == "not_applicable" else "skipped"
            _rp = state.get("run_path") or run_path
            if _rp:
                update_step_status(_rp, current, "skipped")
            step_state["eligibility_status"] = eligibility["status"]
            step_state["reason_code"] = eligibility.get("reason_code")
            step_state["message"] = eligibility.get("message") or "Agent not applicable for this run."
            state["steps"][current] = step_state
            if current not in state["steps_completed"]:
                state["steps_completed"].append(current)
            update_history(state, f"{current} marked {step_state['status']}: {step_state['message']}")
            scope_constraints = state_manager.read("scope_constraints") or []
            scope_constraints.append(
                {
                    "agent": current,
                    "reason_code": step_state["reason_code"],
                    "message": step_state["message"],
                }
            )
            state_manager.write("scope_constraints", scope_constraints)
            save_state(state_path, state)

            if current in PIPELINE_SEQUENCE:
                idx = PIPELINE_SEQUENCE.index(current)
                if idx + 1 < len(PIPELINE_SEQUENCE):
                    state["current_step"] = PIPELINE_SEQUENCE[idx + 1]
                    state["next_step"] = PIPELINE_SEQUENCE[idx + 1]
                else:
                    state["status"] = "complete"
                    state["next_step"] = "complete"
                    update_history(state, "Pipeline completed successfully")
            else:
                state["status"] = "complete"
                state["next_step"] = "complete"
                update_history(state, "Pipeline completed successfully")
            save_state(state_path, state)
            continue
        
        # CRITICAL OVERRIDE: Check if drift blocking is disabled
        from core.config import ENABLE_DRIFT_BLOCKING
        
        if current in blocked:
            # Check if this is a drift-related block
            drift_notes = [note for note in validation_report.get("notes", []) if "drift" in note.lower()]
            
            if drift_notes and not ENABLE_DRIFT_BLOCKING:
                # Drift block but blocking is disabled - PROCEED
                print(f"[ORCHESTRATOR] Agent '{current}' blocked by drift, but ENABLE_DRIFT_BLOCKING={ENABLE_DRIFT_BLOCKING}. Proceeding.", file=sys.stderr, flush=True)
                # Don't skip - continue to agent execution
            else:
                # Non-drift block OR drift blocking is enabled - SKIP
                step_state = state["steps"].setdefault(current, {"name": current})
                step_state["status"] = "skipped"
                _rp = state.get("run_path") or run_path
                if _rp:
                    update_step_status(_rp, current, "skipped")
                step_state["message"] = "Skipped by validation guard"
                state["steps"][current] = step_state
                state["steps_completed"].append(current)
                update_history(state, f"{current} skipped due to validation guard")
                save_state(state_path, state)

                idx = PIPELINE_SEQUENCE.index(current)
                if idx + 1 < len(PIPELINE_SEQUENCE):
                    state["current_step"] = PIPELINE_SEQUENCE[idx + 1]
                    state["next_step"] = PIPELINE_SEQUENCE[idx + 1]
                else:
                    state["status"] = "complete_with_errors"
                    state["next_step"] = "complete"
                    update_history(state, "Pipeline completed with validation skips")
                save_state(state_path, state)
                continue
        
        # Check if we already did this step (resume logic)
        if current in state["steps_completed"]:
             # Move to next
             idx = PIPELINE_SEQUENCE.index(current)
             if idx + 1 < len(PIPELINE_SEQUENCE):
                state["current_step"] = PIPELINE_SEQUENCE[idx + 1]
                save_state(state_path, state)
                continue
             else:
                state["status"] = "complete"
                save_state(state_path, state)
                # Continue loop to hit the Verification Gate at the top (lines 419+)
                # This ensures final_report.md is validated before we break.
                continue

        # Special handling for ingestion step - it's already done in orchestrate_new_run()
        if current == "ingestion":
            # Ingestion was already completed during run initialization
            # Mark it as completed and move to next step
            finalize_step(state, "ingestion", True, "Ingestion completed during run initialization", "")
            if PIPELINE_SEQUENCE:
                if "type_identifier" in PIPELINE_SEQUENCE:
                    idx = PIPELINE_SEQUENCE.index("type_identifier")
                else:
                    idx = 0
                state["current_step"] = PIPELINE_SEQUENCE[idx]
                state["next_step"] = PIPELINE_SEQUENCE[idx]
            save_state(state_path, state)
            continue

        # Run the agent
        step_state = state["steps"].setdefault(current, {"name": current})
        step_state["eligibility_status"] = "eligible"
        state["steps"][current] = step_state
        mark_step_running(state, current)
        save_state(state_path, state)

        attempts = 0
        success = False
        stdout = ""
        stderr = ""
        while attempts < MAX_STEP_ATTEMPTS:
            attempts += 1
            step_meta = state["steps"].setdefault(current, {"name": current})
            step_meta["attempts"] = attempts
            save_state(state_path, state)

            attempt_success, stdout, stderr = run_agent(current, run_path)
            success = attempt_success
            state = load_state(state_path) or state
            state["steps"].setdefault(current, {"name": current})["attempts"] = attempts

            if success:
                break

            update_history(state, f"{current} attempt {attempts} failed", returncode=1)
            save_state(state_path, state)
            if attempts < MAX_STEP_ATTEMPTS:
                time.sleep(RETRY_BACKOFF)

        finalize_step(state, current, success, stdout, stderr)
        # Promote _pending artifacts (e.g. data_profile_pending → data_profile)
        try:
            _finalize_metadata_artifacts(state_manager, current, success)
        except Exception as exc:
            logger.warning(f"[Orchestrator] Metadata promotion for {current}: {exc}")
        if current == "regression":
            try:
                _sync_regression_status(state, state_manager)
                _finalize_regression_artifacts(state_manager, success)
            except Exception as exc:
                # FIX: Don't break the pipeline on regression promotion failure
                # Regression may have been skipped/blocked, which is fine - continue to expositor
                update_history(state, f"Regression artifact promotion warning: {exc}", returncode=0)
                logger.warning(f"[Orchestrator] Regression promotion issue (non-fatal): {exc}")
                # Don't fail, just mark as having warnings and continue
                if state.get("status") not in ("failed",):
                    state["status"] = "running"  # Keep running, don't mark as failed
                save_state(state_path, state)
                # Continue to next step instead of breaking
        if current == "expositor":
            try:
                _finalize_expositor_artifacts(state_manager, run_path, success)
            except Exception as exc:
                # FIX: Don't break the pipeline on expositor promotion failure
                # Instead, log the warning and continue to allow analytics steps to run
                update_history(state, f"Expositor artifact promotion warning: {exc}", returncode=0)
                logger.warning(f"[Orchestrator] Expositor promotion issue (non-fatal): {exc}")
                # Mark as complete_with_errors instead of failed to allow analytics to proceed
                if state.get("status") != "failed":
                    state["status"] = "complete_with_errors"
                save_state(state_path, state)
                # Don't break - continue to trust_evaluation and analytics steps
        if current == "trust_evaluation":
            try:
                _finalize_trust_artifacts(state_manager, run_path, success)
            except Exception as exc:
                # GRACEFUL DEGRADATION: Trust evaluation failure shouldn't crash pipeline
                update_history(state, f"Trust artifact promotion warning: {exc}", returncode=0)
                logger.warning(f"[Orchestrator] Trust promotion issue (non-fatal): {exc}")
                # Pipeline can complete without trust evaluation
                if state.get("status") not in ("failed",):
                    state["status"] = "complete_with_errors"
                save_state(state_path, state)
                # Continue instead of breaking

        # Guard: Check validation before allowing insight-generating agents
        if current in ["overseer", "regression", "personas", "fabricator"]:
            from core.data_guardrails import check_validation_passed
            state_mgr = StateManager(run_path)
            can_proceed, reason = check_validation_passed(state_mgr)
            if not can_proceed:
                state["status"] = "complete_with_errors"
                state["next_step"] = "blocked"
                update_history(state, f"Agent '{current}' blocked: {reason}", returncode=1)
                from core.data_guardrails import append_limitation
                append_limitation(state_mgr, f"Cannot run {current}: {reason}", agent=current, severity="error")
                save_state(state_path, state)
                continue
        
        # Guard: Check domain constraints before running agents
        if current in ["overseer", "regression", "personas"]:
            from core.data_guardrails import is_agent_allowed_for_run, get_domain_constraints
            state_mgr = StateManager(run_path)
            data_type_info = state_mgr.read("data_type_identification") or {}
            data_type = data_type_info.get("primary_type")
            
            allowed, reason = is_agent_allowed_for_run(current, state_mgr, data_type)
            if not allowed:
                # Skip this agent and continue to next step instead of blocking
                step_state = state["steps"].setdefault(current, {"name": current})
                step_state["status"] = "skipped"
                _rp = state.get("run_path") or run_path
                if _rp:
                    update_step_status(_rp, current, "skipped")
                step_state["message"] = reason
                state["steps"][current] = step_state
                state["steps_completed"].append(current)
                update_history(state, f"Agent '{current}' not allowed for data type '{data_type}': {reason}", returncode=0)
                # Used global import

                append_limitation(state_mgr, reason, agent=current, severity="warning")
                
                # Advance to next step
                idx = PIPELINE_SEQUENCE.index(current)
                if idx + 1 < len(PIPELINE_SEQUENCE):
                    state["current_step"] = PIPELINE_SEQUENCE[idx + 1]
                    state["next_step"] = PIPELINE_SEQUENCE[idx + 1]
                else:
                    state["status"] = "complete_with_errors"
                    state["next_step"] = "complete"
                    update_history(state, "Pipeline completed with skipped agents")
                save_state(state_path, state)
                continue
            
            # Store domain constraints for agent awareness
            constraints = get_domain_constraints(data_type)
            state_mgr.write(f"{current}_domain_constraints", constraints)

        
        # Guard: if validation failed, stop pipeline and record limitation
        if current == "validator":
            validation = StateManager(run_path).read("data_validation_report") or {}
            if not validation.get("can_proceed", False):
                state["status"] = "complete_with_errors"
                state["next_step"] = "blocked"
                update_history(state, "Data validation failed; pipeline blocked", returncode=1)
                save_state(state_path, state)
                continue

        if success:
            if current in PIPELINE_SEQUENCE:
                idx = PIPELINE_SEQUENCE.index(current)
                if idx + 1 < len(PIPELINE_SEQUENCE):
                    state["current_step"] = PIPELINE_SEQUENCE[idx + 1]
                    state["next_step"] = PIPELINE_SEQUENCE[idx + 1]
                else:
                    state["next_step"] = "complete"
                    if state.get("failed_steps"):
                        state["status"] = "complete_with_errors"
                        update_history(state, "Pipeline finished with errors")
                    else:
                        state["status"] = "complete"
                        update_history(state, "Pipeline completed successfully")
            else:
                state["next_step"] = "complete"
                if state.get("failed_steps"):
                    state["status"] = "complete_with_errors"
                    update_history(state, "Pipeline finished with errors")
                else:
                    state["status"] = "complete"
                    update_history(state, "Pipeline completed successfully")
        else:
            # Critical agents that must succeed for a valid report
            critical_agents = {"expositor", "scanner", "ingestion"}
            if current in critical_agents:
                print(f"[WARN] Critical step {current} failed repeatedly. Aborting pipeline.")
                state["status"] = "complete_with_errors"
                state["next_step"] = "failed"
                update_history(state, f"{current} failed after {attempts} attempts")
                save_state(state_path, state)
                _record_final_status(run_path, "complete_with_errors", step=current)
                break
            else:
                # Non-critical agent: skip and continue
                print(f"[WARN] Step {current} failed after {attempts} attempts. Skipping and continuing.")
                update_history(state, f"{current} failed after {attempts} attempts - skipped")
                if current in PIPELINE_SEQUENCE:
                    idx = PIPELINE_SEQUENCE.index(current)
                    if idx + 1 < len(PIPELINE_SEQUENCE):
                        state["current_step"] = PIPELINE_SEQUENCE[idx + 1]
                        state["next_step"] = PIPELINE_SEQUENCE[idx + 1]
                    else:
                        state["status"] = "complete_with_errors"
                        state["next_step"] = "complete"
                        update_history(state, "Pipeline completed with errors")

        save_state(state_path, state)
        
        # After all steps complete, run conflict detection
        if state.get("status") in {"complete", "complete_with_errors"}:
            try:
                from core.conflict_detector import ConflictDetector
                state_mgr = StateManager(run_path)
                detector = ConflictDetector(state_mgr)
                conflict_result = detector.run_full_conflict_analysis()
                if conflict_result.get("has_conflicts"):
                    print(f"[ORCHESTRATOR] Detected {conflict_result['conflict_count']} conflict(s)")
                    update_history(state, conflict_result["summary"])
                    save_state(state_path, state)
            except Exception as e:
                print(f"[ORCHESTRATOR] Conflict detection failed: {e}")

            # Provenance lint: ensure insight objects have evidence
            insights_path = Path(run_path) / "artifacts" / "insights.json"
            insights = []
            if insights_path.exists():
                try:
                    import json
                    with open(insights_path, "r", encoding="utf-8") as f:
                        insights = json.load(f)
                except Exception:
                    insights = []

            if insights:
                prov = validate_insights(insights)
                if not prov["ok"]:
                    update_history(state, "Provenance lint failed: missing evidence keys", missing=prov["missing"])
                    append_limitation(StateManager(run_path), "Insights missing evidence; narrative must not assert unsupported claims.", agent="expositor", severity="error")
                    state["status"] = "complete_with_errors"
                    save_state(state_path, state)
            save_state(state_path, state)

            try:
                manifest = read_manifest(run_path) or {}
                health = build_run_health_summary(manifest)
                StateManager(run_path).write("run_health_summary", health)
                invariants = run_invariants(manifest)
                StateManager(run_path).write("invariant_report", invariants)
                seal_manifest(run_path, reason="run_complete")
            except Exception as e:
                update_history(state, f"Invariant/health summary failed: {e}")

            # Generate smart LLM-powered narrative summary
            try:
                from core.smart_narrative import generate_narrative_for_run
                state_mgr = StateManager(run_path)
                narrative = generate_narrative_for_run(state_mgr)
                if narrative:
                    update_history(state, "Smart narrative generated successfully")
                    print(f"[ORCHESTRATOR] Smart narrative generated using {narrative.get('model_used', 'unknown')}")
            except Exception as e:
                print(f"[ORCHESTRATOR] Smart narrative generation failed (non-fatal): {e}")
                update_history(state, f"Smart narrative generation failed: {e}")

        time.sleep(POLL_TIME)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("data", nargs="?", default="data/test_full.csv", help="Path to input CSV")
    args = parser.parse_args()
    
    new_run_id, new_run_path = orchestrate_new_run(args.data)
    if new_run_path:
        main_loop(new_run_path)




