import os
import json
import time
import subprocess
import sys
import traceback
import threading
import shutil
from datetime import datetime, timezone
from pathlib import Path

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
from core.governance import rebuild_governance_artifacts, should_block_agent, render_governed_report, INSIGHT_AGENTS
from core.agent_eligibility import resolve_agent_eligibility
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
    pending = state_manager.read("regression_insights_pending")
    if not success:
        state_manager.delete("regression_insights_pending")
        return
    if not pending:
        raise RuntimeError("Regression succeeded but no pending artifact found.")
    state_manager.write("regression_insights", pending)
    if not state_manager.exists("regression_insights"):
        raise RuntimeError("Regression artifacts failed validation and were discarded.")
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
    for name in required + optional:
        pending_name = f"{name}_pending"
        artifact = state_manager.read(pending_name)
        if artifact is None:
            if name in required:
                raise RuntimeError(f"Regression succeeded but {name} missing.")
            continue
        state_manager.write(name, artifact)
        state_manager.delete(pending_name)


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
        state_manager.write(name, pending)
        if not state_manager.exists(name):
            raise RuntimeError(f"{name} failed validation and was discarded.")
        state_manager.delete(f"{name}_pending")


def initialize_state(run_id, state_path, data_path):
    from core.pipeline_map import calculate_progress

    steps = {}
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

    progress_info = calculate_progress(step, state.get("steps_completed", []))
    state.update(progress_info)

    update_history(state, f"{step} started")
    run_path = state.get("run_path")
    if run_path:
        update_step_status(run_path, step, "running")


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

    progress_info = calculate_progress(state.get("current_step", step), state.get("steps_completed", []))
    state.update(progress_info)

    event = "completed" if success else "failed"
    update_history(state, f"{step} {event}", returncode=0 if success else 1)
    run_path = state.get("run_path")
    if run_path:
        update_step_status(run_path, step, "success" if success else "failed")


def calculate_agent_timeout(run_path, agent_name):
    """Calculate dynamic timeout based on dataset size and agent type."""
    base_timeout = 900  # 15 minutes base timeout
    
    # Try to determine data size
    try:
        state = StateManager(run_path)
        data_path = state.get_file_path("cleaned_uploaded.csv")
        if os.path.exists(data_path):
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
        "sentry": "sentry",
        "personas": "persona_engine",
        "fabricator": "fabricator",
        "expositor": "expositor",
        "trust_evaluation": "trust_evaluation",
    }
    
    script_name = agent_script_map.get(agent_name, agent_name)
    
    # Data type guardrails before launching heavy agents
    if agent_name not in {"type_identifier", "validator", "scanner", "interpreter", "trust_evaluation"}:
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
    data_path = dataset_info.get("path") or state_manager.get_file_path("cleaned_uploaded.csv")

    config = PerformanceConfig()
    timeout = calculate_file_timeout(data_path, config)
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
    run_config = run_config or {}
    if "task_intent" not in run_config and not os.getenv("ACE_ALLOW_UNSCOPED"):
        raise ValueError("Task Contract missing. Provide task_intent payload or set ACE_ALLOW_UNSCOPED=1 for legacy runs.")
    print("=== ACE V3 ORCHESTRATOR START ===")
    
    # 1. Create Run
    run_id, run_path = create_run_folder(run_id=run_id)
    state_manager = StateManager(run_path)
    progress = ProgressTracker(run_path)
    config = PerformanceConfig()
    print(f"[RUN] Run ID: {run_id}")
    print(f"[RUN] Run Path: {run_path}")
    
    # OPERATION GLASS HOUSE: Path Verification
    run_path_obj = Path(run_path)
    print(f"[ORCHESTRATOR] TARGET RUN DIR: {run_path_obj.resolve()}", file=sys.stderr, flush=True)
    print(f"[ORCHESTRATOR] Exists? {run_path_obj.exists()}", file=sys.stderr, flush=True)
    print(f"[ORCHESTRATOR] Is Directory? {run_path_obj.is_dir()}", file=sys.stderr, flush=True)

    
    # 2. Ingest Data (fast vs full). Respect fast_mode in run_config; default to fast for large files.
    if not os.path.exists(data_path):
        print(f"[ERROR] Data file not found: {data_path}")
        shutil.rmtree(run_path, ignore_errors=True)
        return None, None

    file_size_mb = os.path.getsize(data_path) / (1024 * 1024)
    fast_override = None
    if run_config and "fast_mode" in run_config:
        fast_override = bool(run_config.get("fast_mode"))
    fast_mode = fast_override if fast_override is not None else file_size_mb >= 25
    print(f"Preparing dataset ({file_size_mb:.2f} MB): {data_path} | fast_mode={fast_mode}")

    try:
        manifest_path, ingestion_meta = prepare_run_data(
            data_path, run_path, progress=progress, config=config, fast_mode=fast_mode
        )
        state_manager.write("ingestion_meta", ingestion_meta)

        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        active_path = manifest.get("parquet_path") or manifest.get("source_path")
        dataset_fingerprint = compute_dataset_fingerprint(
            manifest.get("sha256", ""),
            manifest.get("columns", []),
            manifest.get("row_count_estimate", 0),
        )
        state_manager.write(
            "active_dataset",
            {
                "path": active_path,
                "source": manifest.get("source_path"),
                "strategy": "fast" if manifest.get("fast_mode_used") else "full",
                "manifest": str(manifest_path),
            },
        )
        initialize_manifest(run_path, run_id, dataset_fingerprint, created_at=iso_now())
        print(f"Dataset manifest ready: {manifest_path}")

    except Exception as e:
        print(f"Ingestion failed: {e}")
        shutil.rmtree(run_path, ignore_errors=True)
        return None, None

    # 3. Init State
    state_path = os.path.join(run_path, "orchestrator_state.json")
    state = initialize_state(run_id, state_path, manifest.get("source_path", data_path))
    state["run_path"] = run_path
    state["start_epoch"] = time.time()
    state["artifacts"] = {
        "dataset_manifest": os.path.basename(manifest_path),
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

    state["data_path"] = active_path
    if run_config:
        state["run_config"] = run_config
        state_manager.write("run_config", run_config)
        if run_config.get("task_intent"):
            state_manager.write("task_intent", run_config["task_intent"])
    # Default mode handling
    run_mode = "strict"
    if run_config and run_config.get("mode") in {"strict", "exploratory"}:
        run_mode = run_config["mode"]
    state["run_mode"] = run_mode
    state_manager.write("run_mode", run_mode)

    # Build governance artifacts (identity card, task contract, confidence)
    rebuild_governance_artifacts(state_manager)
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

        # Fast-mode runtime budget: if elapsed > 60s, skip remaining heavy steps and jump to expositor
        run_config = state_manager.read("run_config") or {}
        ingestion_meta = state_manager.read("ingestion_meta") or {}
        fast_mode_flag = run_config.get("fast_mode")
        fast_mode = bool(fast_mode_flag) if fast_mode_flag is not None else bool(ingestion_meta.get("fast_mode"))
        start_epoch = state.get("start_epoch")
        if fast_mode and start_epoch:
            elapsed = time.time() - start_epoch
            if elapsed > 60 and current != "expositor":
                heavy_steps = {"overseer", "regression", "sentry", "personas", "fabricator"}
                for step in PIPELINE_SEQUENCE:
                    if step == "expositor":
                        continue
                    if step in state.get("steps_completed", []):
                        continue
                    if step in heavy_steps or PIPELINE_SEQUENCE.index(step) >= PIPELINE_SEQUENCE.index(current):
                        step_state = state["steps"].setdefault(step, {"name": step})
                        if step_state.get("status") not in {"completed", "skipped", "failed"}:
                            step_state["status"] = "skipped"
                            step_state["message"] = "Skipped due to fast-mode time budget"
                            state["steps"][step] = step_state
                            state.setdefault("failed_steps", []).append(step)
                            run_path = state.get("run_path")
                            if run_path:
                                update_step_status(run_path, step, "skipped")
                update_history(state, f"Fast-mode budget exceeded ({elapsed:.1f}s); jumping to expositor")
                state["current_step"] = "expositor"
                state["next_step"] = "expositor"
                save_state(state_path, state)
                continue

        # Honor validation guardrails (skip blocked agents rather than hallucinate)
        validation_report = state_manager.read("validation_report") or {}
        blocked = set(validation_report.get("blocked_agents") or [])
        analysis_intent = state_manager.read("analysis_intent") or {}
        eligibility = resolve_agent_eligibility(current, analysis_intent)
        if eligibility["status"] != "eligible":
            step_state = state["steps"].setdefault(current, {"name": current})
            step_state["status"] = "not_applicable" if eligibility["status"] == "not_applicable" else "skipped"
            run_path = state.get("run_path")
            if run_path:
                update_step_status(run_path, current, "skipped")
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
                run_path = state.get("run_path")
                if run_path:
                    update_step_status(run_path, current, "skipped")
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

        # Ensure governance spine present before insight agents run
        if current in INSIGHT_AGENTS:
            if not state_manager.read("dataset_identity_card") or not state_manager.read("task_contract"):
                rebuild_governance_artifacts(state_manager)
            if not state_manager.read("dataset_identity_card"):
                update_history(state, f"{current} blocked: missing identity card")
                append_limitation(state_manager, "Identity card missing; cannot proceed.", agent=current, severity="error")
                finalize_step(state, current, False, "", "Missing identity card")
                state["status"] = "complete_with_errors"
                state["next_step"] = "blocked"
                save_state(state_path, state)
                continue

            blocked, reason = should_block_agent(current, state_manager)
            if blocked:
                step_state = state["steps"].setdefault(current, {"name": current})
                step_state["status"] = "skipped"
                run_path = state.get("run_path")
                if run_path:
                    update_step_status(run_path, current, "skipped")
                step_state["message"] = reason
                state["steps_completed"].append(current)
                state["steps"][current] = step_state
                append_limitation(state_manager, f"{current} blocked: {reason}", agent=current, severity="error")
                update_history(state, f"{current} skipped due to governance: {reason}")
                # mark pipeline as limited
                state["status"] = "complete_with_errors"
                idx = PIPELINE_SEQUENCE.index(current)
                if idx + 1 < len(PIPELINE_SEQUENCE):
                    state["current_step"] = PIPELINE_SEQUENCE[idx + 1]
                    state["next_step"] = PIPELINE_SEQUENCE[idx + 1]
                else:
                    state["next_step"] = "complete"
                save_state(state_path, state)
                continue

        # NEW: Enforce quality-based fail-safe before running insight agents
        # Optionally pre-filter some agents based on quality or task contract
        identity = state_manager.read("dataset_identity_card") or {}
        quality_score = identity.get("quality_score", 0.4)  # Default to minimum floor
        
        print(f"[ORCHESTRATOR DEBUG] Quality score for agent filtering: {quality_score}", flush=True)
        
        # Lowered threshold from 0.75 to 0.4 to match scanner minimum floor
        if current != "trust_evaluation" and quality_score < 0.4:
            step_state = state["steps"].setdefault(current, {"name": current})
            step_state["status"] = "skipped"
            run_path = state.get("run_path")
            if run_path:
                update_step_status(run_path, current, "skipped")
            step_state["message"] = f"Quality score {quality_score:.2f} < 0.40: Agent disabled by fail-safe"
            state["steps"][current] = step_state
            state["steps_completed"].append(current)
            
            append_limitation(
                state_manager,
                f"{current} disabled: Quality score {quality_score:.2f} below 0.40 threshold. "
                f"Predictive analysis requires higher data quality to prevent hallucinations.",
                agent=current,
                severity="error"
            )
            
            update_history(state, f"{current} blocked by quality fail-safe (score: {quality_score:.2f})")
            
            # Advance to next step
            idx = PIPELINE_SEQUENCE.index(current)
            if idx + 1 < len(PIPELINE_SEQUENCE):
                state["current_step"] = PIPELINE_SEQUENCE[idx + 1]
                state["next_step"] = PIPELINE_SEQUENCE[idx + 1]
            else:
                state["status"] = "complete_with_errors"
                state["next_step"] = "complete"
            
            save_state(state_path, state)
            continue

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
        if current == "regression":
            try:
                _sync_regression_status(state, state_manager)
                _finalize_regression_artifacts(state_manager, success)
            except Exception as exc:
                update_history(state, f"Regression artifact promotion failed: {exc}", returncode=1)
                state["status"] = "failed"
                state["failure_reason"] = "regression_artifact_promotion_failed"
                save_state(state_path, state)
                _record_final_status(run_path, "failed", reason="regression_artifact_promotion_failed")
                seal_manifest(run_path, reason="regression_artifact_promotion_failed")
                break
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
                update_history(state, f"Trust artifact promotion failed: {exc}", returncode=1)
                state["status"] = "failed"
                state["failure_reason"] = "trust_artifact_promotion_failed"
                save_state(state_path, state)
                _record_final_status(run_path, "failed", reason="trust_artifact_promotion_failed")
                seal_manifest(run_path, reason="trust_artifact_promotion_failed")
                break

        if current in {"scanner", "type_identifier"}:
            try:
                _finalize_metadata_artifacts(state_manager, current, success)
            except Exception as exc:
                update_history(state, f"Metadata artifact promotion failed: {exc}", returncode=1)
                state["status"] = "failed"
                state["failure_reason"] = "metadata_artifact_promotion_failed"
                save_state(state_path, state)
                _record_final_status(run_path, "failed", reason="metadata_artifact_promotion_failed")
                seal_manifest(run_path, reason="metadata_artifact_promotion_failed")
                break

        # Refresh governance artifacts whenever upstream schema context changes
        if success and current in GOVERNANCE_REFRESH_STEPS:
            try:
                rebuild_governance_artifacts(StateManager(run_path))
            except Exception as e:
                update_history(state, f"Governance rebuild failed after {current}: {e}")

        # Guard: Check validation before allowing insight-generating agents
        if current in ["overseer", "regression", "personas", "fabricator"]:
            from core.data_guardrails import check_validation_passed
            state_mgr = StateManager(run_path)
            can_proceed, reason = check_validation_passed(state_mgr)
            # Allow exploratory mode to continue with limitations
            run_mode = state_mgr.read("run_mode") or "strict"
            if not can_proceed and run_mode != "exploratory":
                update_history(state, f"Agent '{current}' blocked by validation. Jumping to report generation.", returncode=1)
                
                append_limitation(state_mgr, f"Cannot run {current}. Skipping to final report.", agent=current, severity="error")
                
                # Jump to expositor to ensure report is generated
                state["current_step"] = "expositor"
                state["next_step"] = "expositor"
                save_state(state_path, state)
                continue
            elif not can_proceed and run_mode == "exploratory":
                update_history(state, f"Validation failed but continuing (exploratory): {reason}", returncode=0)
        
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
                run_path = state.get("run_path")
                if run_path:
                    update_step_status(run_path, current, "skipped")
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

        
        # Guard: if validation failed, stop pipeline unless force_run is set or insights are allowed
        if current == "validator":
            validation = StateManager(run_path).read("validation_report") or {}
            run_cfg = StateManager(run_path).read("run_config") or {}
            force_run = bool(run_cfg.get("force_run"))
            allow_insights = validation.get("allow_insights", False)
            
            # Block only if validation failed AND insights are not allowed AND force_run is not set
            # Block only if validation failed AND insights are not allowed AND force_run is not set
            if not validation.get("can_proceed", False) and not allow_insights and not force_run:
                # STABILITY FIX: Don't block completely. Jump to Expositor to generate a proper "Rejection Report".
                # This ensures the UI has a valid report and "enhanced_analytics" state (even if empty).
                update_history(state, "Data validation failed; jumping to Final Report", returncode=1)
                
                state["status"] = "running" # Keep running so we can execute Expositor
                state["current_step"] = "expositor"
                state["next_step"] = "expositor"
                
                # Mark intermediate steps as skipped
                for step in PIPELINE_SEQUENCE:
                    if PIPELINE_SEQUENCE.index(step) > PIPELINE_SEQUENCE.index("validator") and step != "expositor":
                         state["steps"].setdefault(step, {})["status"] = "skipped"
                         
                save_state(state_path, state)
                continue
            elif not validation.get("can_proceed", False) and allow_insights:
                # Allow continuation with warnings when insights are allowed
                update_history(state, "Validation warnings present but insights allowed; continuing", returncode=0)
                # Pipeline will advance normally to next step
            elif not validation.get("can_proceed", False) and force_run:
                update_history(state, "Validation failed but continuing due to force_run", returncode=0)
                # Pipeline will advance normally to next step

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
            print(f"[WARN] Step {current} failed repeatedly. Aborting pipeline.")
            state["status"] = "complete_with_errors"
            state["next_step"] = "failed"
            update_history(state, f"{current} failed after {attempts} attempts")
            save_state(state_path, state)
            _record_final_status(run_path, "complete_with_errors", step=current)
            break

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
            # Render governed report with enforced contract/evidence
            try:
                render_governed_report(StateManager(run_path), insights_path)
            except Exception as e:
                update_history(state, f"Governed report rendering failed: {e}")
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
        
        time.sleep(POLL_TIME)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("data", nargs="?", default="data/test_full.csv", help="Path to input CSV")
    args = parser.parse_args()
    
    new_run_id, new_run_path = orchestrate_new_run(args.data)
    if new_run_path:
        main_loop(new_run_path)




