import os
import json
import time
import subprocess
import sys
import traceback
import threading
import shutil
from datetime import datetime
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.resolve()))
from core.env import ensure_windows_cpu_env
ensure_windows_cpu_env()

from core.pipeline_map import PIPELINE_SEQUENCE, PIPELINE_DESCRIPTIONS

# --- PROTOCOL 1000: FORCE EXPOSITOR INCLUSION ---
# Ensure expositor is ALWAYS in the execution sequence
if "expositor" not in PIPELINE_SEQUENCE:
    print("[ORCHESTRATOR] âš ï¸ 'expositor' missing from PIPELINE_SEQUENCE. FORCING INCLUSION.", file=sys.stderr, flush=True)
    # This shouldn't happen, but if it does, we fix it at runtime
    PIPELINE_SEQUENCE.append("expositor")

# Double-check: Ensure expositor is the LAST step
if PIPELINE_SEQUENCE[-1] != "expositor":
    print(f"[ORCHESTRATOR] âš ï¸ 'expositor' is not the final step (current: {PIPELINE_SEQUENCE[-1]}). Reordering...", file=sys.stderr, flush=True)
    if "expositor" in PIPELINE_SEQUENCE:
        PIPELINE_SEQUENCE.remove("expositor")
    PIPELINE_SEQUENCE.append("expositor")

print(f"[ORCHESTRATOR] ðŸ“‹ Final Pipeline Sequence: {PIPELINE_SEQUENCE}", file=sys.stderr, flush=True)
# ------------------------------------------------

from core.run_utils import create_run_folder
from core.state_manager import StateManager
from core.data_guardrails import is_agent_allowed, append_limitation
from core.insights import validate_insights
from core.governance import rebuild_governance_artifacts, should_block_agent, render_governed_report, INSIGHT_AGENTS
from core.data_loader import calculate_file_timeout
from agents.data_sanitizer import DataSanitizer
from ace_v4.performance.config import PerformanceConfig
from intake.stream_loader import prepare_run_data
from intake.profiling import profile_dataframe, compute_drift_report, save_json
from jobs.progress import ProgressTracker

POLL_TIME = 0.5  # seconds
MAX_STEP_ATTEMPTS = 3
RETRY_BACKOFF = 2
GOVERNANCE_REFRESH_STEPS = {"scanner", "type_identifier", "interpreter", "validator"}


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
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


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
    }
    
    script_name = agent_script_map.get(agent_name, agent_name)
    
    # Data type guardrails before launching heavy agents
    if agent_name not in {"type_identifier", "validator", "scanner", "interpreter"}:
        sm = StateManager(run_path)
        dtype_info = sm.read("data_type_identification") or {}
        data_type = dtype_info.get("primary_type")
        allowed, reason = is_agent_allowed(agent_name, data_type)
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
    
    # OPERATION GLASS HOUSE: Forensic Subprocess Wrapper
    print(f"[ORCHESTRATOR] ðŸš€ Launching Agent: {agent_name}...", file=sys.stderr, flush=True)

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
            # ðŸš¨ THE SMOKING GUN REVEALED ðŸš¨
            print(f"\n{'='*80}", file=sys.stderr, flush=True)
            print(f"ðŸ›‘ CRITICAL AGENT FAILURE: {agent_name}", file=sys.stderr, flush=True)
            print(f"ðŸ›‘ EXIT CODE: {result.returncode}", file=sys.stderr, flush=True)
            print(f"{'-'*80}", file=sys.stderr, flush=True)
            
            # PRINT THE HIDDEN TRACEBACK
            if result.stderr:
                print(f"ðŸ” AGENT STDERR (The Root Cause):", file=sys.stderr, flush=True)
                print(result.stderr, file=sys.stderr, flush=True)
            else:
                print(f"âš ï¸ NO STDERR CAPTURED (Process died instantly)", file=sys.stderr, flush=True)
            
            if result.stdout:
                print(f"{'-'*80}", file=sys.stderr, flush=True)
                print(f"ðŸ“‹ AGENT STDOUT:", file=sys.stderr, flush=True)
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
            return False, result.stdout, sanitized_stderr
        else:
            # Success case
            from utils.logging import log_ok
            log_ok(f"Agent {agent_name} completed", agent=agent_name, run_path=run_path)
            return True, result.stdout, result.stderr

    except subprocess.TimeoutExpired as e:
        from utils.logging import log_error
        log_error(
            f"Agent {agent_name} timed out after {e.timeout} seconds",
            agent=agent_name,
            timeout=e.timeout,
            run_path=run_path
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
    print(f"[ORCHESTRATOR] ðŸ” TARGET RUN DIR: {run_path_obj.resolve()}", file=sys.stderr, flush=True)
    print(f"[ORCHESTRATOR] ðŸ” Exists? {run_path_obj.exists()}", file=sys.stderr, flush=True)
    print(f"[ORCHESTRATOR] ðŸ” Is Directory? {run_path_obj.is_dir()}", file=sys.stderr, flush=True)

    
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
        state_manager.write(
            "active_dataset",
            {
                "path": active_path,
                "source": manifest.get("source_path"),
                "strategy": "fast" if manifest.get("fast_mode_used") else "full",
                "manifest": str(manifest_path),
            },
        )
        print(f"Dataset manifest ready: {manifest_path}")

    except Exception as e:
        print(f"Ingestion failed: {e}")
        shutil.rmtree(run_path, ignore_errors=True)
        return None, None

    # 3. Init State
    state_path = os.path.join(run_path, "orchestrator_state.json")
    state = initialize_state(run_id, state_path, manifest.get("source_path", data_path))
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

        # STABILITY LAW 1: ABSOLUTE REPORT ENFORCEMENT
        # The pipeline SHALL NOT complete without a physical final_report.md
        # Using Report Enforcer module for absolute path verification
        if state.get("status") in {"complete", "complete_with_errors", "failed"}:
            # Import at function scope
            from core.report_enforcer import enforce_report_existence
            
            # --- PROTOCOL 1100: PREVENT PREMATURE COMPLETION ---
            # Ensure expositor has run before allowing pipeline to complete
            expositor_completed = "expositor" in state.get("steps_completed", [])
            
            if not expositor_completed:
                print(f"[ORCHESTRATOR] âš ï¸ Protocol 1100: Pipeline marked {state['status']} but EXPOSITOR hasn't run. FORCING CONTINUATION.", file=sys.stderr, flush=True)
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
                print(f"[ORCHESTRATOR] âŒ CRITICAL: Report enforcer failed. Blocking completion.")
                state["status"] = "failed"
                state["failure_reason"] = "CRITICAL: Report generation failed after all retries"
                update_history(state, "Report enforcer blocked completion - no valid report", returncode=1)
                save_state(state_path, state)
                _record_final_status(run_path, "failed", reason="report_enforcer_block")
                break
            
            # Report verified - safe to complete
            print(f"[ORCHESTRATOR] âœ“ Report verified. Pipeline completion authorized.")
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
                update_history(state, f"Fast-mode budget exceeded ({elapsed:.1f}s); jumping to expositor")
                state["current_step"] = "expositor"
                state["next_step"] = "expositor"
                save_state(state_path, state)
                continue

        # Honor validation guardrails (skip blocked agents rather than hallucinate)
        validation_report = state_manager.read("validation_report") or {}
        blocked = set(validation_report.get("blocked_agents") or [])
        
        # CRITICAL OVERRIDE: Check if drift blocking is disabled
        from core.config import ENABLE_DRIFT_BLOCKING
        
        if current in blocked:
            # Check if this is a drift-related block
            drift_notes = [note for note in validation_report.get("notes", []) if "drift" in note.lower()]
            
            if drift_notes and not ENABLE_DRIFT_BLOCKING:
                # Drift block but blocking is disabled - PROCEED
                print(f"[ORCHESTRATOR] âš ï¸ Agent '{current}' blocked by drift, but ENABLE_DRIFT_BLOCKING={ENABLE_DRIFT_BLOCKING}. PROCEEDING.", file=sys.stderr, flush=True)
                # Don't skip - continue to agent execution
            else:
                # Non-drift block OR drift blocking is enabled - SKIP
                step_state = state["steps"].setdefault(current, {"name": current})
                step_state["status"] = "skipped"
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
            idx = PIPELINE_SEQUENCE.index("type_identifier")  # First real agent step
            if idx < len(PIPELINE_SEQUENCE):
                state["current_step"] = PIPELINE_SEQUENCE[idx]
                state["next_step"] = PIPELINE_SEQUENCE[idx]
            save_state(state_path, state)
            continue

        # Run the agent
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
        if quality_score < 0.4:
                step_state = state["steps"].setdefault(current, {"name": current})
                step_state["status"] = "skipped"
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
            from core.data_guardrails import is_agent_allowed, get_domain_constraints
            state_mgr = StateManager(run_path)
            data_type_info = state_mgr.read("data_type_identification") or {}
            data_type = data_type_info.get("primary_type")
            
            allowed, reason = is_agent_allowed(current, data_type)
            if not allowed:
                # Skip this agent and continue to next step instead of blocking
                step_state = state["steps"].setdefault(current, {"name": current})
                step_state["status"] = "skipped"
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
        
        time.sleep(POLL_TIME)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("data", nargs="?", default="data/test_full.csv", help="Path to input CSV")
    args = parser.parse_args()
    
    new_run_id, new_run_path = orchestrate_new_run(args.data)
    if new_run_path:
        main_loop(new_run_path)





