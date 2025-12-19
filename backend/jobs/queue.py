import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Optional

from .models import Job, JobStatus

DB_PATH = Path("data") / "jobs.db"


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jobs (
                run_id TEXT PRIMARY KEY,
                file_path TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                message TEXT,
                run_path TEXT,
                run_config TEXT
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def enqueue(file_path: str, run_config: Optional[dict] = None) -> str:
    init_db()
    run_id = str(uuid.uuid4())[:8]
    now = iso_now()
    payload = json.dumps(run_config) if run_config else None

    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            INSERT INTO jobs (run_id, file_path, status, created_at, updated_at, run_config)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (run_id, file_path, JobStatus.QUEUED.value, now, now, payload),
        )
        conn.commit()
    finally:
        conn.close()
    return run_id


def fetch_next() -> Optional[Job]:
    init_db()
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.isolation_level = "EXCLUSIVE"
        cur = conn.cursor()
        cur.execute(
            "SELECT run_id, file_path, status, created_at, updated_at, message, run_path, run_config "
            "FROM jobs WHERE status = ? ORDER BY created_at LIMIT 1",
            (JobStatus.QUEUED.value,),
        )
        row = cur.fetchone()
        if not row:
            return None
        job = Job.from_row(row)
        cur.execute(
            "UPDATE jobs SET status = ?, updated_at = ? WHERE run_id = ?",
            (JobStatus.RUNNING.value, iso_now(), job.run_id),
        )
        conn.commit()
        return job
    finally:
        conn.close()


def update_status(
    run_id: str,
    status: JobStatus,
    message: Optional[str] = None,
    run_path: Optional[str] = None,
):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            UPDATE jobs
            SET status = ?, updated_at = ?, message = COALESCE(?, message), run_path = COALESCE(?, run_path)
            WHERE run_id = ?
            """,
            (status.value, iso_now(), message, run_path, run_id),
        )
        conn.commit()
    finally:
        conn.close()


def get_job(run_id: str) -> Optional[Job]:
    init_db()
    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT run_id, file_path, status, created_at, updated_at, message, run_path, run_config "
            "FROM jobs WHERE run_id = ?",
            (run_id,),
        )
        row = cur.fetchone()
        if not row:
            return None
        return Job.from_row(row)
    finally:
        conn.close()


def list_jobs(limit: int = 50) -> Iterable[Job]:
    init_db()
    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT run_id, file_path, status, created_at, updated_at, message, run_path, run_config "
            "FROM jobs ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        rows = cur.fetchall()
        return [Job.from_row(r) for r in rows]
    finally:
        conn.close()






