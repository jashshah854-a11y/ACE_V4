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
from agents.overseer import build_feature_matrix  # reuse your safe builder
from core.schema import SchemaMap, ensure_schema_map

class Sentry:
    def __init__(self, schema_map, state: StateManager):
        self.schema_map = ensure_schema_map(schema_map)
        self.state = state

    def run(self):
        df = self._load_base_frame()

        # Use universal anomaly detection
        try:
            anomalies_summary = detect_universal_anomalies(df, self.schema_map)
            
            # Format for output
            # Sentry output expects "anomalies" as a list of dicts (rows)
            # detect_universal_anomalies returns indices and a summary.
            # We need to reconstruct the row data for the report.
            
            anomalies_list = []
            if anomalies_summary["total_count"] > 0:
                # We need to fetch the actual rows based on indices
                # But detect_universal_anomalies doesn't return the rows directly to save memory?
                # Wait, it returns "indices".
                indices = anomalies_summary["indices"]
                anomalies_list = df.iloc[indices].to_dict(orient="records")
            
            payload = {
                "status": "ok",
                "anomaly_count": anomalies_summary["total_count"],
                "anomalies": anomalies_list[:100], # Limit to 100
                "drivers": anomalies_summary.get("drivers", {}),
                "role_deviations": anomalies_summary.get("role_deviations", {})
            }
            self.state.write("anomalies", payload)
            
        except Exception as e:
            print(f"Sentry analysis failed: {e}")
            self.state.write("anomalies", {
                "status": "error", 
                "reason": str(e),
                "anomaly_count": 0,
                "anomalies": []
            })

    def _load_base_frame(self) -> pd.DataFrame:
        overseer_out = self.state.read("overseer_output")
        if overseer_out and "rows" in overseer_out:
            return pd.DataFrame(overseer_out["rows"])
        
        dataset_info = self.state.read("active_dataset") if self.state else None
        candidate = dataset_info.get("path") if isinstance(dataset_info, dict) else None
        if candidate and Path(candidate).exists():
             return pd.read_csv(candidate)

        data_path = self.state.get_file_path("cleaned_uploaded.csv")
        if Path(data_path).exists():
             return pd.read_csv(data_path)
             
        return pd.DataFrame()


    def fallback(self, error):
        print(f"Sentry fallback triggered: {error}")
        return {
            "status": "fallback",
            "reason": str(error),
            "anomaly_count": 0,
            "anomalies": []
        }


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
    except Exception as e:
        print(f"[ERROR] Sentry agent failed: {e}")
        fallback_output = agent.fallback(e)
        state.write("anomalies", fallback_output)
        sys.exit(1)


if __name__ == "__main__":
    main()

