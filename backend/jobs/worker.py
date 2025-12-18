import os
import time
from pathlib import Path

from core.run_utils import create_run_folder
from jobs.models import JobStatus
from jobs.progress import ProgressTracker
from jobs.queue import fetch_next, update_status
from orchestrator import orchestrate_new_run, main_loop

POLL_INTERVAL = 2.0


def _log(msg: str):
    print(f"[WORKER] {msg}", flush=True)


def process_job():
    job = fetch_next()
    if not job:
        return False

    _log(f"Picked job {job.run_id} -> {job.file_path}")

    if not Path(job.file_path).exists():
        update_status(job.run_id, JobStatus.FAILED, message="File missing")
        _log(f"File missing for job {job.run_id}")
        return True

    try:
        run_id, run_path = orchestrate_new_run(
            job.file_path, run_config=job.run_config, run_id=job.run_id
        )
    except Exception as exc:
        update_status(job.run_id, JobStatus.FAILED, message=str(exc))
        _log(f"Failed to initialize run {job.run_id}: {exc}")
        return True

    if not run_path:
        update_status(job.run_id, JobStatus.FAILED, message="Run initialization failed")
        _log(f"Run path missing for job {job.run_id}")
        return True

    update_status(job.run_id, JobStatus.RUNNING, run_path=run_path)

    tracker = ProgressTracker(run_path)
    tracker.update("job", {"status": "running", "run_id": run_id})

    try:
        main_loop(run_path)
        tracker.update("job", {"status": "completed"})
        update_status(job.run_id, JobStatus.COMPLETED, run_path=run_path)
        _log(f"Job {job.run_id} completed")
    except Exception as exc:
        tracker.update("job", {"status": "failed", "error": str(exc)})
        update_status(job.run_id, JobStatus.FAILED, message=str(exc), run_path=run_path)
        _log(f"Job {job.run_id} failed: {exc}")

    return True


def worker_loop():
    _log("Worker started. Polling queue...")
    while True:
        processed = process_job()
        if not processed:
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    worker_loop()

