from __future__ import annotations

import json
import time
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent))

from typing import Dict

from connectors.runner import ConnectorRunner
from jobs.queue import enqueue
from observability.logger import get_logger, log_event
from observability.metrics import inc_counter, set_gauge, write_metrics_file
from core.config import settings


def load_state(path: Path) -> Dict[str, Dict]:
    if not path.exists():
        return {}
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_state(path: Path, state: Dict[str, Dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(state, f, indent=2)


logger = get_logger("scheduler")

def run_scheduler(
    config_path: Path,
    progress_state: Path,
    runner_state: Path,
    poll_seconds: int = 60,
    max_cycles: int | None = None,
):
    runner = ConnectorRunner(config_path=config_path, state_path=runner_state)
    log_event(logger, "info", "scheduler_started", poll_seconds=poll_seconds)
    cycles = 0
    while True:
        if max_cycles is not None and cycles >= max_cycles:
            break
        cycles += 1
        schedule_state = load_state(progress_state)
        set_gauge("scheduler_queue_size", len(schedule_state))
        due = list(runner.get_due_connectors())
        set_gauge("scheduler_due_connectors", len(due))
        if not due:
            time.sleep(poll_seconds)
            continue
        for cfg in due:
            name = cfg.get('name') or cfg.get('type')
            try:
                result = runner.run_once(cfg)
                enqueue(
                    str(result.file_path),
                    run_config={'source': {'connector': name, **result.metadata}},
                )
                schedule_state[name] = {'last_run_at': time.time(), 'status': 'queued'}
                inc_counter("scheduler_runs_total", {"connector": name})
                set_gauge("scheduler_last_run_timestamp", time.time(), {"connector": name})
                log_event(logger, "info", "connector_run_enqueued", connector=name, file=str(result.file_path))
            except Exception as exc:
                schedule_state[name] = {'last_run_at': time.time(), 'status': f'error: {exc}'}
                inc_counter("scheduler_failures_total", {"connector": name})
                log_event(logger, "error", "connector_run_failed", connector=name, error=str(exc))
        save_state(progress_state, schedule_state)
        if settings.metrics_enabled:
            write_metrics_file()
        time.sleep(poll_seconds)


if __name__ == '__main__':
    from core.config import settings

    if not settings.connectors_enabled:
        print('Connectors disabled; exiting scheduler.')
    else:
        run_scheduler(
            config_path=Path(settings.connectors_config_path),
            progress_state=Path(settings.scheduler_state_path),
            runner_state=Path(settings.connector_state_path),
            poll_seconds=settings.scheduler_poll_seconds,
        )
