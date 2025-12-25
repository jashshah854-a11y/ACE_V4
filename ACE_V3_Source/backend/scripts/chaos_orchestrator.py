from __future__ import annotations

import argparse
import multiprocessing as mp
import random
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from orchestrator import orchestrate_new_run, main_loop


def _run_orchestrator(data_path: str) -> None:
    run_id, run_path = orchestrate_new_run(data_path)
    if run_path:
        main_loop(run_path)



def _spawn_orchestrator(data_path: str) -> mp.Process:
    proc = mp.Process(target=_run_orchestrator, args=(data_path,), daemon=True)
    proc.start()
    return proc


def main() -> None:
    parser = argparse.ArgumentParser(description="Chaos test the orchestrator by killing/restarting runs.")
    parser.add_argument("data", help="Path to dataset (CSV) for runs.")
    parser.add_argument("--iterations", type=int, default=3)
    parser.add_argument("--min-runtime", type=float, default=5.0)
    parser.add_argument("--max-runtime", type=float, default=12.0)
    parser.add_argument("--sleep-between", type=float, default=1.0)
    args = parser.parse_args()

    data_path = Path(args.data)
    if not data_path.exists():
        raise FileNotFoundError(f"Dataset not found: {data_path}")

    events = []
    for idx in range(1, args.iterations + 1):
        proc = _spawn_orchestrator(str(data_path))
        runtime = random.uniform(args.min_runtime, args.max_runtime)
        time.sleep(runtime)

        if not proc.is_alive():
            proc.join(timeout=5)
            events.append(f"round {idx}: orchestrator completed (exit={proc.exitcode})")
        else:
            if random.random() < 0.5:
                proc.terminate()
                event = "terminated"
            else:
                proc.kill()
                event = "killed"
            proc.join(timeout=5)
            events.append(f"round {idx}: orchestrator {event} after {runtime:.1f}s")
        time.sleep(args.sleep_between)

    print("=== Chaos Orchestrator Summary ===")
    for entry in events:
        print(entry)


if __name__ == "__main__":
    main()
