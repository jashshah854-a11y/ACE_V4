import sys
from pathlib import Path

import pandas as pd

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from core.data_typing import classify_dataset
from core.data_profile import build_data_profile
from core.dataset_classification import classify_dataset_profile
from core.analytics_validation import apply_artifact_validation
from core.cache import load_cache, save_cache
from core.run_manifest import read_manifest
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

        data_profile = self.state.read("data_profile")
        if not isinstance(data_profile, dict):
            data_profile = build_data_profile(df)
            validated_profile = apply_artifact_validation("data_profile", data_profile)
            if validated_profile:
                self.state.write("data_profile_pending", validated_profile)

        analysis_intent = self.state.read("analysis_intent") or {}
        manifest = read_manifest(self.state.run_path) or {}
        fingerprint = manifest.get("dataset_fingerprint", "unknown")
        pipeline_version = manifest.get("pipeline_version", "unknown")
        cache_key = f"{fingerprint}_{pipeline_version}_dataset_classification"
        cached_classification = load_cache(cache_key)
        classification = cached_classification if isinstance(cached_classification, dict) else None
        if classification is None:
            classification = classify_dataset_profile(data_profile, analysis_intent=analysis_intent)
        validated_classification = apply_artifact_validation("dataset_classification", classification)
        if validated_classification:
            self.state.write("dataset_classification_pending", validated_classification)
            if not cached_classification:
                save_cache(cache_key, validated_classification)
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


