from __future__ import annotations

import argparse
import os
import sys
import multiprocessing as mp
import random
import time
from pathlib import Path
from typing import List
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


from core.config import settings
from jobs.scheduler import run_scheduler


def _resolve_path(value: str | None, default: str) -> Path:
    path = Path(value or default)
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _spawn_scheduler(config: Path, progress: Path, runner: Path, poll_seconds: int, max_cycles: int) -> mp.Process:
    proc = mp.Process(
        target=run_scheduler,
        kwargs={
            "config_path": config,
            "progress_state": progress,
            "runner_state": runner,
            "poll_seconds": poll_seconds,
            "max_cycles": max_cycles,
        },
        daemon=True,
    )
    proc.start()
    return proc


def main() -> None:
    parser = argparse.ArgumentParser(description="Chaos test the connector scheduler by repeatedly killing/restarting it.")
    parser.add_argument("--config", type=str, default=settings.connectors_config_path, help="Path to connectors config JSON.")
    parser.add_argument("--progress-state", type=str, default=settings.scheduler_state_path, help="Path to scheduler progress state file.")
    parser.add_argument("--runner-state", type=str, default=settings.connector_state_path, help="Path to runner state file.")
    parser.add_argument("--iterations", type=int, default=5, help="How many chaos rounds to execute.")
    parser.add_argument("--min-runtime", type=float, default=2.0, help="Minimum seconds to let the scheduler run before intervention.")
    parser.add_argument("--max-runtime", type=float, default=5.0, help="Maximum seconds before intervention.")
    parser.add_argument("--poll-seconds", type=int, default=1, help="Scheduler polling interval while testing.")
    parser.add_argument("--max-cycles", type=int, default=5, help="Number of cycles each spawned scheduler can run if not killed earlier.")

    args = parser.parse_args()

    config_path = Path(args.config)
    if not config_path.exists():
        raise FileNotFoundError(f"Connectors config not found: {config_path}")

    progress_state = _resolve_path(args.progress_state, settings.scheduler_state_path)
    runner_state = _resolve_path(args.runner_state, settings.connector_state_path)

    events: List[str] = []
    for idx in range(1, args.iterations + 1):
        proc = _spawn_scheduler(
            config=config_path,
            progress=progress_state,
            runner=runner_state,
            poll_seconds=args.poll_seconds,
            max_cycles=args.max_cycles,
        )
        runtime = random.uniform(args.min_runtime, args.max_runtime)
        time.sleep(runtime)

        if not proc.is_alive():
            proc.join(timeout=2)
            events.append(f"round {idx}: scheduler exited naturally in {runtime:.2f}s (exitcode={proc.exitcode})")
            continue

        if random.random() < 0.5:
            proc.terminate()
            proc.join(timeout=2)
            events.append(f"round {idx}: forcibly terminated scheduler after {runtime:.2f}s")
        else:
            proc.kill()
            proc.join(timeout=2)
            events.append(f"round {idx}: killed scheduler (SIGKILL) after {runtime:.2f}s")

    print("=== Chaos Scheduler Summary ===")
    for line in events:
        print(line)
    print(f"State files persisted at {progress_state} and {runner_state}")


if __name__ == "__main__":
    main()
