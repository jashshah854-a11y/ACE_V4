import pandas as pd
import json
import numpy as np
import sys
import os
from pathlib import Path

from core.env import ensure_windows_cpu_env

ensure_windows_cpu_env()

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from utils.logging import log_launch, log_ok, log_warn
from core.state_manager import StateManager
from core.analytics import run_universal_clustering
from core.schema import SchemaMap, ensure_schema_map
from core.auto_features import auto_feature_groups
from core.data_quality import compute_data_quality
from core.data_loader import smart_load_dataset
from ace_v4.performance.config import PerformanceConfig
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from core.explainability import persist_evidence
from core.scope_enforcer import ScopeEnforcer, ScopeViolationError

def build_feature_matrix(df, schema_map):
    resolved_schema = ensure_schema_map(schema_map)
    cols = resolved_schema.basic_types.numeric
    if not cols:
        # Fallback to all columns if no numeric types defined
        cols = df.columns.tolist()
    
    # Filter for columns that actually exist in the DF
    valid_cols = [c for c in cols if c in df.columns]
    
    matrix = df[valid_cols].copy()

    for col in valid_cols:
         # Force numeric conversion
        matrix[col] = pd.to_numeric(matrix[col], errors="coerce").fillna(0)

    return matrix

class Overseer:
    def __init__(self, schema_map: SchemaMap, state: StateManager):
        self.schema_map = ensure_schema_map(schema_map)
        self.state = state
        self.name = "Overseer"

    def run(self):
        log_launch(f"Triggering ACE {self.name}...")
        
        # Load Data
        data_path = None
        run_config = self.state.read("run_config") or {}
        ingestion_meta = self.state.read("ingestion_meta") or {}
        fast_mode = bool(run_config.get("fast_mode", ingestion_meta.get("fast_mode", False)))
        dataset_info = self.state.read("active_dataset") if self.state else None
        candidate = dataset_info.get("path") if isinstance(dataset_info, dict) else None
        if candidate and Path(candidate).exists():
            data_path = candidate

        if not data_path:
            data_path = self.state.get_file_path("cleaned_uploaded.csv")

        if not Path(data_path).exists():
            raise ValueError(f"Dataset not found at {data_path}")

        try:
            print(f"[Overseer] Loading CSV from {data_path}")
            config = PerformanceConfig()
            df = smart_load_dataset(
                data_path,
                config=config,
                fast_mode=fast_mode,
                prefer_parquet=True,
            )
            print(f"[Overseer] Loaded {len(df)} rows, {len(df.columns)} columns")
        except Exception as e:
            raise ValueError(f"Could not load data from {data_path}: {e}")

        try:
            scope_guard = ScopeEnforcer(self.state, agent=self.name.lower())
            df = scope_guard.trim_dataframe(df)
        except ScopeViolationError as exc:
            log_warn(f"Scope lock blocked Overseer: {exc}")
            raise

        # 1. Run Universal Clustering
        print(f"[Overseer] Starting clustering...")
        try:
            clustering_results = run_universal_clustering(df, self.schema_map, fast_mode=fast_mode)

            stats = {
                "k": clustering_results.get("k"),
                "silhouette": clustering_results.get("silhouette"),
                "data_quality": compute_data_quality(df)
            }
            payload = {
                "stats": stats,
                "fingerprints": clustering_results.get("fingerprints", {}),
                "labels": clustering_results.get("labels", []),
                "sizes": clustering_results.get("sizes", []),
                "feature_importance": clustering_results.get("feature_importance", []),
                "confidence_interval": clustering_results.get("confidence_interval"),
            }

            evidence_id = None
            if clustering_results.get("evidence") and self.state:
                evidence_id = persist_evidence(self.state, clustering_results["evidence"], scope="clustering")
            if evidence_id:
                payload["evidence_id"] = evidence_id

            if clustering_results.get("artifacts") and self.state:
                self.state.write("clustering_artifacts", clustering_results["artifacts"])

            # Save output
            if self.state:
                self.state.write("overseer_output", payload)
            else:
                with open("data/overseer_output.json", "w") as f:
                    json.dump(payload, f, indent=2)

            log_ok("Overseer V3 Complete. Output saved.")
            return "overseer done"

        except Exception as e:
            log_warn(f"Clustering failed: {e}.")
            raise


def main():
    if len(sys.argv) < 2:
        print("Usage: python overseer.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)
    
    # Load Schema
    schema_data = state.read("schema_map")
    schema_map = ensure_schema_map(schema_data)

    agent = Overseer(schema_map=schema_map, state=state)
    try:
        agent.run()
    except Exception as e:
        print(f"[ERROR] Overseer agent failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

