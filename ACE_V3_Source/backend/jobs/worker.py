from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Dict, Optional

from accounts import services as account_services
from accounts.database import get_session, init_db
from core.config import settings
from jobs.models import JobStatus
from jobs.progress import ProgressTracker
from jobs.queue import fetch_next, update_status
from observability.logger import get_logger, log_event
from observability.metrics import inc_counter, set_gauge, record_job_duration, write_metrics_file
from orchestrator import orchestrate_new_run, main_loop

POLL_INTERVAL = 2.0
DATA_DIR = Path("data")
HEARTBEAT_PATH = DATA_DIR / "worker_heartbeat.json"

logger = get_logger("worker")

ACTIVE_CONNECTORS: Dict[str, int] = {}


def _get_connector_name(job) -> Optional[str]:
    if isinstance(job.run_config, dict):
        source = job.run_config.get("source") or {}
        name = source.get("connector")
        if name:
            return str(name)
    return None


def _can_start_job(job) -> bool:
    connector = _get_connector_name(job)
    if not connector:
        return True
    limit = max(1, getattr(settings, 'connector_max_concurrency', 1))
    return ACTIVE_CONNECTORS.get(connector, 0) < limit


def _set_connector_gauge(name: str):
    set_gauge("worker_connector_active", ACTIVE_CONNECTORS.get(name, 0), {"connector": name})


def _increment_active(connector: Optional[str]):
    if not connector:
        return
    ACTIVE_CONNECTORS[connector] = ACTIVE_CONNECTORS.get(connector, 0) + 1
    _set_connector_gauge(connector)


def _decrement_active(connector: Optional[str]):
    if not connector:
        return
    if connector in ACTIVE_CONNECTORS:
        ACTIVE_CONNECTORS[connector] = max(0, ACTIVE_CONNECTORS[connector] - 1)
        _set_connector_gauge(connector)



def _write_heartbeat(status: str, job_id: Optional[str] = None) -> None:
    payload: Dict[str, Optional[str | float]] = {
        "status": status,
        "job_id": job_id,
        "timestamp": time.time(),
    }
    HEARTBEAT_PATH.parent.mkdir(parents=True, exist_ok=True)
    HEARTBEAT_PATH.write_text(json.dumps(payload), encoding="utf-8")
    set_gauge("worker_last_heartbeat_epoch", payload["timestamp"])


def _log(msg: str, level: str = "info", **extra) -> None:
    log_event(logger, level, msg, **extra)


init_db()


def process_job() -> bool:
    job = fetch_next(predicate=_can_start_job)
    if not job:
        set_gauge("worker_jobs_inflight", 0)
        return False

    connector = _get_connector_name(job)
    _increment_active(connector)
    try:
        _log("job_picked", job_id=job.run_id, file_path=job.file_path)
        _write_heartbeat("picked", job.run_id)

        if not Path(job.file_path).exists():
            update_status(job.run_id, JobStatus.FAILED, message="File missing")
            inc_counter("worker_failures_total", {"reason": "file_missing"})
            _log("job_file_missing", level="error", job_id=job.run_id)
            return True

        try:
            start_init = time.time()
            run_id, run_path = orchestrate_new_run(
                job.file_path, run_config=job.run_config, run_id=job.run_id
            )
            record_job_duration("worker_orchestration_seconds", start_init, {"job": job.run_id})
        except Exception as exc:
            update_status(job.run_id, JobStatus.FAILED, message=str(exc))
            inc_counter("worker_failures_total", {"reason": "init"})
            _log("job_init_failed", level="error", job_id=job.run_id, error=str(exc))
            return True

        if not run_path:
            update_status(job.run_id, JobStatus.FAILED, message="Run initialization failed")
            inc_counter("worker_failures_total", {"reason": "run_path"})
            _log("job_run_path_missing", level="error", job_id=job.run_id)
            return True

        update_status(job.run_id, JobStatus.RUNNING, run_path=run_path)
        tracker = ProgressTracker(run_path)
        tracker.update("job", {"status": "running", "run_id": run_id})
        set_gauge("worker_jobs_inflight", 1)
        _write_heartbeat("running", job.run_id)

        tenant_meta: Dict[str, str] = {}
        if isinstance(job.run_config, dict):
            tenant_meta = job.run_config.get("tenant") or {}
        if tenant_meta:
            with get_session() as session:
                account_services.bind_run(
                    session,
                    run_id=run_id,
                    org_id=tenant_meta.get("org_id"),
                    project_id=tenant_meta.get("project_id"),
                    run_path=run_path,
                )

        job_start = time.time()
        try:
            main_loop(run_path)
            tracker.update("job", {"status": "completed"})
            update_status(job.run_id, JobStatus.COMPLETED, run_path=run_path)
            inc_counter("worker_jobs_completed_total", {"status": "success"})
            _log("job_completed", job_id=job.run_id)
        except Exception as exc:
            tracker.update("job", {"status": "failed", "error": str(exc)})
            update_status(job.run_id, JobStatus.FAILED, message=str(exc), run_path=run_path)
            inc_counter("worker_jobs_completed_total", {"status": "failed"})
            _log("job_failed", level="error", job_id=job.run_id, error=str(exc))
        finally:
            record_job_duration("worker_job_duration_seconds", job_start, {"job": job.run_id})
            set_gauge("worker_jobs_inflight", 0)
            _write_heartbeat("idle")
            if settings.metrics_enabled:
                write_metrics_file()

        return True
    finally:
        _decrement_active(connector)




def worker_loop() -> None:
    _log("worker_started")
    while True:
        processed = process_job()
        if not processed:
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    worker_loop()

