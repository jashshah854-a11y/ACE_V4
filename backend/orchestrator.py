import os
import json
import time
import subprocess
import sys
import threading
import shutil
from datetime import datetime
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from core.env import ensure_windows_cpu_env
ensure_windows_cpu_env()

from core.pipeline_map import PIPELINE_SEQUENCE, PIPELINE_DESCRIPTIONS
from core.run_utils import create_run_folder
from core.state_manager import StateManager
from core.data_guardrails import is_agent_allowed, append_limitation
from core.data_loader import calculate_file_timeout
from agents.data_sanitizer import DataSanitizer
from ace_v4.performance.config import PerformanceConfig
from intake.stream_loader import prepare_run_data
from intake.profiling import profile_dataframe, compute_drift_report, save_json
from jobs.progress import ProgressTracker

POLL_TIME = 0.5  # seconds
MAX_STEP_ATTEMPTS = 3
RETRY_BACKOFF = 2


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
    """Persist orchestrator state with safe writes."""
    state["updated_at"] = iso_now()
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def iso_now():
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def initialize_state(run_id, state_path, data_path):
    steps = {}
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
        "current_step": PIPELINE_SEQUENCE[0],
        "next_step": PIPELINE_SEQUENCE[0],
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

    save_state(state_path, state)
    return state


def update_history(state, message, **payload):
    entry = {"timestamp": iso_now(), "event": message}
    if payload:
        entry.update(payload)
    state.setdefault("history", []).append(entry)


def mark_step_running(state, step):
    step_state = state["steps"].setdefault(step, {"name": step})
    if step_state.get("status") == "running":
        return
    step_state["status"] = "running"
    step_state["started_at"] = iso_now()
    step_state["_start_epoch"] = time.time()
    state["steps"][step] = step_state
    state["status"] = "running"
    state["current_step"] = step
    update_history(state, f"{step} started")


def finalize_step(state, step, success, stdout, stderr):
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
    

    try:
        result = subprocess.run(
            [sys.executable, agent_script, run_path],
            capture_output=True,
            text=True,
            env=env,
            timeout=agent_timeout  # Dynamic timeout based on file size
            timeout=timeout
        )

        if result.returncode != 0:
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
    
    # 2. Sanitize Data (Step 0 - Pre-pipeline)
    # We do this here to ensure the run folder has the clean data before the pipeline starts
    if not os.path.exists(data_path):
        print(f"[ERROR] Data file not found: {data_path}")
        shutil.rmtree(run_path, ignore_errors=True)
        return None, None

    file_size_mb = os.path.getsize(data_path) / (1024 * 1024)
    print(f"Preparing dataset ({file_size_mb:.2f} MB): {data_path}")

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

    except Exception as e:
        print(f"Sanitization failed: {e}")
        shutil.rmtree(run_path, ignore_errors=True)
        return None, None

    # 3. Init State
    state_path = os.path.join(run_path, "orchestrator_state.json")
    state = initialize_state(run_id, state_path, cleaned_path)
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
    if run_config:
        state["run_config"] = run_config
        state_manager.write("run_config", run_config)
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

        if state.get("status") in {"complete", "complete_with_errors", "failed"}:
            final_status = state.get("status", "unknown")
            _record_final_status(run_path, final_status)
            print(f"Pipeline finished with status: {state['status']}")
            break

        current = state["current_step"]

        # Honor validation guardrails (skip blocked agents rather than hallucinate)
        validation_report = state_manager.read("validation_report") or {}
        blocked = set(validation_report.get("blocked_agents") or [])
        if blocked and current in blocked:
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
                _record_final_status(run_path, "complete")
                break

        # Run the agent
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
            from core.data_guardrails import is_agent_allowed, get_domain_constraints
            state_mgr = StateManager(run_path)
            data_type_info = state_mgr.read("data_type_identification") or {}
            data_type = data_type_info.get("primary_type")
            
            allowed, reason = is_agent_allowed(current, data_type)
            if not allowed:
                state["status"] = "complete_with_errors"
                state["next_step"] = "blocked"
                update_history(state, f"Agent '{current}' not allowed for data type '{data_type}'", returncode=1)
                from core.data_guardrails import append_limitation
                append_limitation(state_mgr, reason, agent=current, severity="error")
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
                _record_final_status(run_path, "complete_with_errors", reason="data_validation_block")
                # Don't break - allow pipeline to continue but mark as limited
                continue

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
        
        time.sleep(POLL_TIME)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("data", nargs="?", default="data/test_full.csv", help="Path to input CSV")
    args = parser.parse_args()
    
    new_run_id, new_run_path = orchestrate_new_run(args.data)
    if new_run_path:
        main_loop(new_run_path)

