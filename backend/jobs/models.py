import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    FAILED = "failed"
    COMPLETED = "completed"


@dataclass
class Job:
    run_id: str
    file_path: str
    status: JobStatus
    created_at: str
    updated_at: str
    message: Optional[str] = None
    run_path: Optional[str] = None
    run_config: Optional[Any] = field(default=None)

    @classmethod
    def from_row(cls, row: tuple):
        (
            run_id,
            file_path,
            status,
            created_at,
            updated_at,
            message,
            run_path,
            run_config_json,
        ) = row
        run_config = None
        if run_config_json:
            try:
                run_config = json.loads(run_config_json)
            except Exception:
                run_config = run_config_json
        return cls(
            run_id=run_id,
            file_path=file_path,
            status=JobStatus(status),
            created_at=created_at,
            updated_at=updated_at,
            message=message,
            run_path=run_path,
            run_config=run_config,
        )






