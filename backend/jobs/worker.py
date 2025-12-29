import os
import sys
import time
from pathlib import Path

# Add backend directory to path if not already there
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from core.run_utils import create_run_folder
from jobs.models import JobStatus
from jobs.progress import ProgressTracker
from jobs.redis_queue import RedisJobQueue  # Changed from SQLite queue
from orchestrator import orchestrate_new_run, main_loop

POLL_INTERVAL = 2.0


def _log(msg: str):
    print(f"[WORKER] {msg}", flush=True)


# Initialize Redis queue
try:
    queue = RedisJobQueue()
    _log("Redis queue initialized")
except Exception as e:
    _log(f"Failed to initialize Redis queue: {e}")
    _log("Make sure REDIS_URL environment variable is set")
    sys.exit(1)


def process_job():
    """Fetch and process next job from Redis queue."""
    job = queue.fetch_next(timeout=5)  # Blocking pop with 5s timeout
    if not job:
        return False

    _log(f"Picked job {job.run_id} -> {job.file_path}")

    if not Path(job.file_path).exists():
        queue.update_status(job.run_id, JobStatus.FAILED, message="File missing")
        _log(f"File missing for job {job.run_id}")
        return True

    try:
        run_id, run_path = orchestrate_new_run(
            job.file_path, run_config=job.run_config, run_id=job.run_id
        )
    except Exception as exc:
        queue.update_status(job.run_id, JobStatus.FAILED, message=str(exc))
        _log(f"Failed to initialize run {job.run_id}: {exc}")
        return True

    if not run_path:
        queue.update_status(job.run_id, JobStatus.FAILED, message="Run initialization failed")
        _log(f"Run path missing for job {job.run_id}")
        return True

    queue.update_status(job.run_id, JobStatus.RUNNING, run_path=run_path)

    tracker = ProgressTracker(run_path)
    tracker.update("job", {"status": "running", "run_id": run_id})

    try:
        main_loop(run_path)
        tracker.update("job", {"status": "completed"})
        queue.update_status(job.run_id, JobStatus.COMPLETED, run_path=run_path)
        _log(f"Job {job.run_id} completed")
    except Exception as exc:
        tracker.update("job", {"status": "failed", "error": str(exc)})
        queue.update_status(job.run_id, JobStatus.FAILED, message=str(exc), run_path=run_path)
        _log(f"Job {job.run_id} failed: {exc}")

    return True


def worker_loop():
    _log("Worker started (Redis queue). Polling for jobs...")
    while True:
        try:
            processed = process_job()
            if not processed:
                # No job available, brpop already waited
                pass
        except Exception as e:
            _log(f"Worker error: {e}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    worker_loop()
