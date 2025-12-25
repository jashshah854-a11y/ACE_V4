#!/usr/bin/env python3
from __future__ import annotations

import argparse
import multiprocessing as mp
import os
import random
import sys
import time
from pathlib import Path
from typing import Dict, Optional

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from jobs.worker import worker_loop


def _spawn_worker() -> mp.Process:
    proc = mp.Process(target=worker_loop, daemon=True)
    proc.start()
    return proc


def main() -> None:
    parser = argparse.ArgumentParser(description="Chaos test the job worker by repeatedly killing/restarting it.")
    parser.add_argument("--iterations", type=int, default=5, help="How many chaos rounds to execute.")
    parser.add_argument("--min-runtime", type=float, default=2.0, help="Minimum runtime before intervention.")
    parser.add_argument("--max-runtime", type=float, default=6.0, help="Maximum runtime before intervention.")
    parser.add_argument("--sleep-between", type=float, default=0.5, help="Pause between restarts.")
    args = parser.parse_args()

    events = []
    for idx in range(1, args.iterations + 1):
        proc = _spawn_worker()
        runtime = random.uniform(args.min_runtime, args.max_runtime)
        time.sleep(runtime)

        if not proc.is_alive():
            proc.join(timeout=2)
            events.append(f"round {idx}: worker exited naturally (exit={proc.exitcode})")
        else:
            if random.random() < 0.5:
                proc.terminate()
                mode = "terminate"
            else:
                proc.kill()
                mode = "kill"
            proc.join(timeout=2)
            events.append(f"round {idx}: worker {mode}d after {runtime:.2f}s")
        time.sleep(args.sleep_between)

    print("=== Chaos Worker Summary ===")
    for event in events:
        print(event)


if __name__ == "__main__":
    main()
