import sys
from pathlib import Path

import pandas as pd

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from core.data_typing import classify_dataset
from core.data_loader import smart_load_dataset
from ace_v4.performance.config import PerformanceConfig
from jobs.progress import ProgressTracker
from utils.logging import log_launch, log_ok, log_warn


class TypeIdentifier:
    """
    Mandatory pre-analysis agent that classifies the dataset using schema and content signals.
    Writes a structured `data_type` artifact for downstream guardrails and reporting.
    """

    def __init__(self, state: StateManager):
        self.state = state

    def run(self):
        log_launch("Running Data Type Identification...")
        dataset_path = self._resolve_dataset_path()
        if not dataset_path:
            log_warn("No dataset found for type identification.")
            self.state.write("data_type", {"primary_type": "unknown", "confidence": 0.0})
            return

        run_config = self.state.read("run_config") or {}
        ingestion_meta = self.state.read("ingestion_meta") or {}
        fast_mode = bool(run_config.get("fast_mode", ingestion_meta.get("fast_mode", False)))
        df = smart_load_dataset(
            dataset_path,
            config=PerformanceConfig(),
            max_rows=1500,
            fast_mode=fast_mode,
            prefer_parquet=True,
        )
        result = classify_dataset(df).as_dict()
        # Write to both keys for backward compatibility
        self.state.write("data_type_identification", result)
        self.state.write("data_type", result)
        log_ok(f"Data type identified: {result['primary_type']} ({result['confidence_label']})")

    def _resolve_dataset_path(self) -> str:
        dataset_info = self.state.read("active_dataset") or {}
        candidate = dataset_info.get("path")
        if candidate and Path(candidate).exists():
            return candidate
        fallback = self.state.get_file_path("cleaned_uploaded.csv")
        if Path(fallback).exists():
            return fallback
        return ""


def main():
    if len(sys.argv) < 2:
        print("Usage: python type_identifier.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)
    tracker = ProgressTracker(run_path)
    try:
        tracker.update("type_identifier", {"status": "running"})
        agent = TypeIdentifier(state)
        agent.run()
        tracker.update("type_identifier", {"status": "completed"})
    except Exception as e:
        log_warn(f"Type identification failed: {e}")
        tracker.update("type_identifier", {"status": "failed", "error": str(e)})
        state.write("data_type", {"primary_type": "unknown", "confidence": 0.0, "notes": [str(e)]})
        sys.exit(1)


if __name__ == "__main__":
    main()


