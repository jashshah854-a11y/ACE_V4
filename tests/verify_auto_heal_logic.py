import json
from pathlib import Path
from unittest.mock import MagicMock, patch

# MOCK CONSTANTS
DATA_DIR = Path("./test_data")
RUN_ID = "test_run_123"
RUN_PATH = DATA_DIR / "runs" / RUN_ID
REPORT_PATH = RUN_PATH / "final_report.md"
STATE_PATH = RUN_PATH / "orchestrator_state.json"

# MOCK LOGGING
class Logger:
    def info(self, msg): print(f"[INFO] {msg}")
    def warning(self, msg): print(f"[WARN] {msg}")
    def error(self, msg): print(f"[ERROR] {msg}")
    
logger = Logger()

# THE LOGIC TO TEST (Copied from server.py)
def auto_heal_logic(run_id, run_path, report_path):
    if not report_path.exists():
        # AUTO-HEAL: If run is technically complete but report is missing, generate fallback
        try:
            status = ""
            created_at = "unknown"
            updated_at = "unknown"

            # 1. Try file-based state first
            state_path = run_path / "orchestrator_state.json"
            if state_path.exists():
                with open(state_path, "r", encoding="utf-8") as f:
                    state = json.load(f)
                
                status = state.get("status", "")
                created_at = state.get("created_at")
                updated_at = state.get("updated_at")
            else:
                 # 2. Try Redis fallback (Iron Dome)
                 try:
                    # SIMULATED REDIS IMPORT
                    # sys.path.append(str(Path(__file__).parent.parent))
                    # from jobs.redis_queue import get_queue
                    
                    # MOCK QUEUE
                    queue = MagicMock()
                    job = MagicMock()
                    job.status = "complete" # SIMULATING REDIS SAYS COMPLETE
                    job.created_at = "2025-01-01"
                    job.updated_at = "2025-01-02"
                    queue.get_job.return_value = job
                    
                    if queue:
                        # job = queue.get_job(run_id)
                        if job:
                           status = job.status
                           created_at = job.created_at
                           updated_at = job.updated_at
                           logger.info(f"[AUTO-HEAL] Recovered status '{status}' from Redis for {run_id}")
                 except Exception as re:
                     logger.warning(f"[AUTO-HEAL] Redis check failed: {re}")

            if status in ["complete", "completed", "complete_with_errors", "failed"]:
                logger.warning(f"[AUTO-HEAL] Run {run_id} is {status} but report missing. Creating specialized fallback...")
                
                fallback_content = (
                    f"# Analysis Report ({status})\n\n"
                    f"**Run ID:** `{run_id}`\n\n"
                    f"> ⚠️ **System Notice:** The final report generation step encountered an issue, but the analysis pipeline finished.\n\n"
                    f"## Status Overview\n"
                    f"- **Status:** {status}\n"
                    f"- **Created:** {created_at}\n"
                    f"- **Updated:** {updated_at}\n\n"
                    f"## Diagnostics\n"
                    f"Please check the [Analysis Logs](/logs/{run_id}) for details on why the `expositor` agent failed to produce output."
                )
                
                # Write the fallback to disk so it sticks
                with open(report_path, "w", encoding="utf-8") as f:
                    f.write(fallback_content)
                
                logger.info(f"[AUTO-HEAL] Fallback report created at {report_path}")
                return True
        except Exception as e:
            logger.error(f"[AUTO-HEAL] Failed to generate fallback: {e}")
            return False
    return False

# SETUP TEST ENV
import shutil
if DATA_DIR.exists(): shutil.rmtree(DATA_DIR)
RUN_PATH.mkdir(parents=True)

print("--- STARTING VERIFICATION ---")
print(f"1. Created test env at {RUN_PATH}")
print("2. Ensuring NO report file exists initially...")
assert not REPORT_PATH.exists()

print("3. Running Auto-Heal Logic (Simulating Missing File + Complete Redis Job)...")
result = auto_heal_logic(RUN_ID, RUN_PATH, REPORT_PATH)

print(f"4. Logic output: {result}")
if result and REPORT_PATH.exists():
    print("✅ SUCCESS: Report file was created!")
    with open(REPORT_PATH, "r") as f:
        print("--- CONTENT ---")
        print(f.read())
        print("---------------")
else:
    print("❌ FAILURE: Report file was NOT created.")
    
# CLEANUP
shutil.rmtree(DATA_DIR)
