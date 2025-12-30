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
from core.analytics import run_universal_clustering, fallback_segmentation
from core.schema import SchemaMap, ensure_schema_map
from core.auto_features import auto_feature_groups
from core.data_quality import compute_data_quality
from core.data_loader import smart_load_dataset
from ace_v4.performance.config import PerformanceConfig
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from core.explainability import persist_evidence
from core.scope_enforcer import ScopeEnforcer, ScopeViolationError
from core.cache import RailwayClusteringCache

def build_feature_matrix(df, schema_map):
    # UNIVERSAL NORMALIZATION PATCH
    if schema_map is None:
        schema_map = {
            "columns": df.columns.tolist(),
            "column_types": {col: "numeric" for col in df.columns},
            "groups": {}
        }

    if isinstance(schema_map, list):
        schema_map = {
            "columns": schema_map,
            "column_types": {col: "numeric" for col in schema_map},
            "groups": {}
        }

    if not isinstance(schema_map, dict):
        cols = getattr(schema_map, "columns", df.columns.tolist())
        types = getattr(schema_map, "column_types", {c: "numeric" for c in cols})
        groups = getattr(schema_map, "groups", {})
        schema_map = {
            "columns": list(cols),
            "column_types": dict(types),
            "groups": dict(groups),
        }

    schema_map.setdefault("columns", df.columns.tolist())
    schema_map.setdefault(
        "column_types",
        {col: "numeric" for col in schema_map["columns"]}
    )
    schema_map.setdefault("groups", {})

    schema_map["columns"] = [
        col for col in schema_map["columns"] if col in df.columns
    ]
    # END PATCH

    cols = schema_map["columns"]
    matrix = df[cols].copy()

    for col in cols:
        try:
            matrix[col] = pd.to_numeric(matrix[col], errors="coerce")
        except:
            matrix[col] = matrix[col].astype("category").cat.codes

    matrix = matrix.fillna(0)

    return matrix

class Overseer:
    def __init__(self, schema_map: SchemaMap, state: StateManager):
        self.schema_map = ensure_schema_map(schema_map)
        self.state = state
        self.name = "Overseer"
        self.cache = RailwayClusteringCache()  # Initialize cache

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
            # Fallback
            data_path = "data/customer_data.csv"

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

        # Check cache before clustering
        fingerprint = self.cache.get_fingerprint(df)
        print(f"[Overseer] Dataset fingerprint: {fingerprint[:16]}...")
        
        cached_results = self.cache.get(fingerprint)
        if cached_results and self.cache.validate(fingerprint, df):
            print(f"[Overseer] Cache HIT! Using cached clustering results")
            
            # Save cached results to state
            if self.state:
                self.state.write("overseer_output", cached_results)
            
            log_ok("Overseer Complete (from cache)")
            return "overseer done (cached)"

        # Cache miss - run clustering
        print(f"[Overseer] Cache MISS - running fresh clustering...")
        
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
                # Analyst Core: Confidence Scoring
                "confidence_score": round((stats.get("silhouette", 0) + 1) / 2 * 0.8 + (stats.get("data_quality", 0) * 0.2), 2),
                "confidence_reasoning": f"Silhouette score {stats.get('silhouette', 0):.2f} indicates cluster separation.",
                # Add metadata for cache validation
                "_metadata": {
                    "row_count": len(df),
                    "columns": df.columns.tolist(),
                    "fingerprint": fingerprint,
                },
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

            # Cache results for future runs
            self.cache.set(fingerprint, payload)
            print(f"[Overseer] Results cached for future runs")

            log_ok("Overseer V3 Complete. Output saved.")
            return "overseer done"

        except Exception as e:
            log_warn(f"Clustering failed: {e}. Using fallback.")
            df["cluster"] = fallback_segmentation(df)

            # Create minimal fallback output
            rows_payload = df.to_dict(orient="records")
            fallback_results = {
                "stats": {"k": 1, "silhouette": 0.0, "data_quality": compute_data_quality(df)},
                "fingerprints": {},
                "labels": [0] * len(df),
                "sizes": [len(df)],
                "rows": rows_payload
            }

            if self.state:
                self.state.write("overseer_output", fallback_results)

            return "overseer done (fallback)"

    def fallback(self, error):
        log_warn(f"Overseer fallback triggered: {error}")
        # Create minimal fallback output
        try:
            data_path = self.state.get_file_path("cleaned_uploaded.csv")
            config = PerformanceConfig()
            df = smart_load_dataset(
                data_path,
                config=config,
                max_rows=10000,
                fast_mode=True,
                prefer_parquet=True,
            )
            df["cluster"] = 0
            rows = df.to_dict(orient="records")
        except:
            rows = []

        return {
            "stats": {"k": 1, "silhouette": 0.0, "data_quality": 0.0},
            "fingerprints": {},
            "rows": rows,
            "error": str(error)
        }


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
        fallback_output = agent.fallback(e)
        state.write("overseer_output", fallback_output)
        sys.exit(1)


if __name__ == "__main__":
    main()

