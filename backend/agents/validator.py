import sys
from pathlib import Path

import pandas as pd

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from core.data_validation import validate_dataset
from jobs.progress import ProgressTracker
from utils.logging import log_launch, log_ok, log_warn


class Validator:
    """Data sufficiency gate that switches ACE into limitation mode when checks fail."""

    def __init__(self, state: StateManager):
        self.state = state

    def run(self):
        log_launch("Running data sufficiency validation...")
        dataset_path = self._resolve_dataset_path()
        if not dataset_path:
            raise FileNotFoundError("No dataset found for validation")

        df = pd.read_csv(dataset_path)
        run_config = self.state.read("run_config") or {}
        schema_map = self.state.read("schema_map") or {}
        data_type = self.state.read("data_type_identification") or self.state.read("data_type") or {}

        ingestion_meta = self.state.read("ingestion_meta") or {}
        drift_status = (ingestion_meta.get("drift_status") or "none").lower()

        report = validate_dataset(df, run_config, schema_map, data_type)

        # Import drift blocking flag
        from core.config import ENABLE_DRIFT_BLOCKING
        
        # Apply drift gating ONLY if enabled
        if drift_status == "block" and ENABLE_DRIFT_BLOCKING:
            report["mode"] = "limitations"
            report["allow_insights"] = False
            report["notes"].append("Profile/sample drift at block level; insights disabled.")
            report["blocked_agents"] = sorted(set(report.get("blocked_agents", [])) | {"overseer", "regression", "personas", "fabricator"})
        elif drift_status == "block" and not ENABLE_DRIFT_BLOCKING:
            # Log the drift but don't block
            report["notes"].append("⚠️ Drift detected but blocking is DISABLED. Proceeding with analysis.")
            print("[VALIDATOR] ⚠️ Blocking drift detected but ENABLE_DRIFT_BLOCKING=False. Allowing insights.", flush=True)

        elif drift_status == "warn":
            report["notes"].append("Profile/sample drift warning; proceed with caution.")

        self.state.write("validation_report", report)
        self.state.write("data_validation_report", report)

        log_ok(f"Validation completed (mode={report['mode']}, confidence={report['confidence_label']})")
        return report

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
        print("Usage: python validator.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)
    tracker = ProgressTracker(run_path)
    try:
        tracker.update("validator", {"status": "running"})
        Validator(state).run()
        tracker.update("validator", {"status": "completed"})
    except Exception as e:
        log_warn(f"Validation failed: {e}")
        tracker.update("validator", {"status": "failed", "error": str(e)})
        sys.exit(1)


if __name__ == "__main__":
    main()


