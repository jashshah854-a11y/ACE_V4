# agents/sentry.py
import sys
import os
import numpy as np
import pandas as pd

from sklearn.ensemble import IsolationForest
from pathlib import Path

from core.env import ensure_windows_cpu_env

ensure_windows_cpu_env()

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from core.schema_utils import get_feature_columns
from core.analytics import detect_universal_anomalies
from core.data_loader import smart_load_dataset
from agents.overseer import build_feature_matrix  # reuse your safe builder
from core.schema import SchemaMap, ensure_schema_map
from ace_v4.performance.config import PerformanceConfig

class Sentry:
    def __init__(self, schema_map, state: StateManager):
        self.schema_map = ensure_schema_map(schema_map)
        self.state = state

    def _sanitize_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Remove corrupted columns that contain lists or non-scalar values."""
        clean_cols = []
        for col in df.columns:
            try:
                # Check if column contains list/array values (corrupted data)
                sample = df[col].dropna().iloc[0] if len(df[col].dropna()) > 0 else None
                if sample is not None and isinstance(sample, (list, np.ndarray)):
                    print(f"[SENTRY] Skipping corrupted column '{col}' (contains list values)")
                    continue
                # Try to check if it's a valid scalar column
                if df[col].dtype == 'object':
                    # For object columns, verify values are actually scalar
                    test_val = str(df[col].iloc[0]) if len(df) > 0 else ""
                    # Check for concatenated number patterns (multiple decimals like "29.851889.5108")
                    if test_val.count('.') > 1 and len(test_val) > 20:
                        print(f"[SENTRY] Skipping corrupted column '{col}' (concatenated values)")
                        continue
                clean_cols.append(col)
            except Exception as e:
                print(f"[SENTRY] Skipping column '{col}' due to error: {e}")
                continue
        return df[clean_cols] if clean_cols else df

    def run(self):
        try:
            df = self._load_base_frame()

            # Sanitize the dataframe to remove corrupted columns
            df = self._sanitize_dataframe(df)

            if df.empty:
                print("[SENTRY] No valid data after sanitization, writing empty result")
                self._write_empty_result()
                return

            # Use universal anomaly detection
            anomalies_summary = detect_universal_anomalies(df, self.schema_map)

            # Format for output
            anomalies_list = []
            if anomalies_summary.get("total_count", 0) > 0:
                indices = anomalies_summary.get("indices", [])
                if indices:
                    anomalies_list = df.iloc[indices].to_dict(orient="records")

            payload = {
                "status": "success",
                "anomaly_count": anomalies_summary.get("total_count", 0),
                "anomalies": anomalies_list[:100],
                "drivers": anomalies_summary.get("drivers", {}),
                "role_deviations": anomalies_summary.get("role_deviations", {})
            }
            self.state.write("anomalies", payload)
        except Exception as e:
            print(f"[SENTRY] Error during anomaly detection: {e}")
            self._write_empty_result()

    def _write_empty_result(self):
        """Write an empty but valid anomalies result."""
        payload = {
            "status": "skipped",
            "anomaly_count": 0,
            "anomalies": [],
            "drivers": {},
            "role_deviations": {},
            "message": "Anomaly detection skipped due to data quality issues"
        }
        self.state.write("anomalies", payload)

    def _load_base_frame(self) -> pd.DataFrame:
        overseer_out = self.state.read("overseer_output")
        if overseer_out and "rows" in overseer_out:
            return pd.DataFrame(overseer_out["rows"])

        config = PerformanceConfig()
        dataset_info = self.state.read("active_dataset") if self.state else None
        candidate = dataset_info.get("path") if isinstance(dataset_info, dict) else None
        if candidate and Path(candidate).exists():
             return smart_load_dataset(candidate, config=config)

        data_path = self.state.get_file_path("cleaned_uploaded.csv")
        if Path(data_path).exists():
             return smart_load_dataset(data_path, config=config)

        raise FileNotFoundError("Active dataset not found for anomaly detection")


def main():
    if len(sys.argv) < 2:
        print("Usage: python sentry.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)

    # Load Schema
    schema_data = state.read("schema_map")
    schema_map = ensure_schema_map(schema_data)

    agent = Sentry(schema_map=schema_map, state=state)

    try:
        agent.run()
        print("[SENTRY] Completed successfully")
    except Exception as e:
        # Write empty result and exit cleanly to not block pipeline
        print(f"[SENTRY] Warning: {e}")
        try:
            payload = {
                "status": "skipped",
                "anomaly_count": 0,
                "anomalies": [],
                "drivers": {},
                "role_deviations": {},
                "message": f"Anomaly detection skipped: {str(e)[:100]}"
            }
            state.write("anomalies", payload)
            print("[SENTRY] Wrote fallback result")
        except Exception:
            pass
        # Exit cleanly - don't crash the pipeline for non-critical anomaly detection
        sys.exit(0)


if __name__ == "__main__":
    main()

