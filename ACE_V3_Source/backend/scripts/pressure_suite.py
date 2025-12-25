from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import List, Tuple

ROOT = Path(__file__).resolve().parents[1]


def _ensure_sample_dataset(path: Path) -> Path:
    if path.exists():
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("col1,col2\n1,2\n3,4\n", encoding="utf-8")
    return path


def _ensure_sample_connector_config(path: Path, source_dir: Path) -> Path:
    if path.exists():
        return path
    source_dir.mkdir(parents=True, exist_ok=True)
    config = {
        "connectors": [
            {
                "name": "pressure-local",
                "type": "local_file",
                "enabled": True,
                "interval_seconds": 1,
                "options": {
                    "path": str(source_dir),
                    "pattern": "*.csv",
                    "output_dir": str(source_dir / "out")
                },
            }
        ]
    }
    path.write_text(json.dumps(config, indent=2), encoding="utf-8")
    return path


def _run(name: str, cmd: List[str], cwd: Path) -> Tuple[bool, str]:
    print(f"\n=== {name} ===")
    result = subprocess.run(cmd, cwd=cwd, text=True)
    success = result.returncode == 0
    status = "ok" if success else f"failed ({result.returncode})"
    print(f"[{name}] {status}")
    return success, status


def main() -> None:
    parser = argparse.ArgumentParser(description="Run targeted tests and chaos scripts for pressure testing.")
    parser.add_argument("--dataset", type=str, default=str(ROOT / "data" / "chaos_small.csv"), help="Dataset for orchestrator chaos.")
    parser.add_argument("--connectors", type=str, default=str(ROOT / "data" / "chaos_connectors.json"), help="Connector config for scheduler chaos.")
    parser.add_argument("--source-dir", type=str, default=str(ROOT / "data" / "pressure_inputs"), help="Directory with CSVs for local connector chaos tests.")
    args = parser.parse_args()

    dataset = _ensure_sample_dataset(Path(args.dataset))
    connector_config = _ensure_sample_connector_config(Path(args.connectors), Path(args.source_dir))

    steps = [
        (
            "pytest_core",
            [sys.executable, "-m", "pytest", "tests/test_scheduler.py", "tests/test_orchestrator_backend.py"],
        ),
        (
            "chaos_worker",
            [sys.executable, "scripts/chaos_worker.py", "--iterations", "1", "--min-runtime", "0.5", "--max-runtime", "1", "--sleep-between", "0.2"],
        ),
        (
            "chaos_scheduler",
            [
                sys.executable,
                "scripts/chaos_scheduler.py",
                "--config",
                str(connector_config),
                "--progress-state",
                str(ROOT / "data" / "chaos_scheduler_state.json"),
                "--runner-state",
                str(ROOT / "data" / "chaos_runner_state.json"),
                "--iterations",
                "1",
                "--min-runtime",
                "0.5",
                "--max-runtime",
                "1",
                "--poll-seconds",
                "1",
                "--max-cycles",
                "2",
            ],
        ),
        (
            "chaos_orchestrator",
            [
                sys.executable,
                "scripts/chaos_orchestrator.py",
                str(dataset),
                "--iterations",
                "1",
                "--min-runtime",
                "2",
                "--max-runtime",
                "3",
                "--sleep-between",
                "0.2",
            ],
        ),
        (
            "pytest_full",
            [sys.executable, "-m", "pytest", "tests", "--maxfail", "1"],
        ),
    ]

    failures = []
    for name, cmd in steps:
        success, status = _run(name, cmd, ROOT)
        if not success:
            failures.append((name, status))
            break

    print("\n=== Pressure Suite Summary ===")
    if failures:
        for name, status in failures:
            print(f"{name}: {status}")
        raise SystemExit(1)
    else:
        print("all steps completed")


if __name__ == "__main__":
    main()
