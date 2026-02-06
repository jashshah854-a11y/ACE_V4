import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from core.data_profile import build_data_profile
from core.analytics_validation import apply_artifact_validation
from core.cache import load_cache, save_cache
from core.run_manifest import read_manifest
from core.data_loader import smart_load_dataset
from ace_v4.performance.config import PerformanceConfig
from schema_scanner.scanner import scan_dataset

class ScannerAgent:
    def __init__(self, schema_map, state: StateManager):
        self.state = state
        # Scanner doesn't need schema_map as it creates the scan
        self.schema_map = schema_map 

    def run(self):
        # Get data path from state or default
        data_path = self.state.get_file_path("cleaned_uploaded.csv")
        if not Path(data_path).exists():
            raise ValueError(f"Dataset not found at {data_path}")
            
        print(f"Scanning: {data_path}")
        scan = scan_dataset(data_path)
        self.state.write("schema_scan_output", scan)

        try:
            manifest = read_manifest(self.state.run_path) or {}
            fingerprint = manifest.get("dataset_fingerprint", "unknown")
            pipeline_version = manifest.get("pipeline_version", "unknown")
            cache_key = f"{fingerprint}_{pipeline_version}_data_profile"
            cached = load_cache(cache_key)
            data_profile = cached if isinstance(cached, dict) else None
            if data_profile is None:
                df = smart_load_dataset(data_path, config=PerformanceConfig())
                data_profile = build_data_profile(df)
            validated = apply_artifact_validation("data_profile", data_profile)
            if validated:
                self.state.write("data_profile_pending", validated)
                if not cached:
                    save_cache(cache_key, validated)
            else:
                print("[SCANNER WARNING] Data profile failed validation; artifact discarded", flush=True)
        except Exception as exc:
            print(f"[SCANNER WARNING] Data profile generation failed: {exc}", flush=True)

        # Compute quality score (0-1 scale)
        columns = scan.get("columns", {})
        max_null_pct = max((col.get("null_pct") or 0 for col in columns.values()), default=0)
        avg_null_pct = sum((col.get("null_pct") or 0 for col in columns.values())) / len(columns) if columns else 0
        
        # DEBUG LOGGING: Track quality calculation components
        print(f"[SCANNER DEBUG] Quality Score Calculation:", flush=True)
        print(f"  - Max Null %: {max_null_pct:.3f}", flush=True)
        print(f"  - Avg Null %: {avg_null_pct:.3f}", flush=True)
        print(f"  - Column Count: {len(columns)}", flush=True)
        
        # Base completeness score
        completeness = 1.0 - avg_null_pct
        print(f"  - Completeness (1 - avg_null): {completeness:.3f}", flush=True)
        
        # Penalty for high max null
        if max_null_pct > 0.5:
            completeness *= 0.8
            print(f"  - Penalty applied (max_null > 0.5): {completeness:.3f}", flush=True)
        
        # CRITICAL FIX: Ensure minimum floor
        # Even "bad" data should score 0.4-0.5, not 0.0
        quality_score = max(0.4, completeness)
        
        print(f"[SCANNER DEBUG] Final Quality Score: {quality_score:.3f}", flush=True)
        
        if quality_score == 0.4:
            print(f"[SCANNER WARNING] Quality score hit minimum floor (0.4). Original: {completeness:.3f}", flush=True)

        scan["quality_score"] = quality_score
        self.state.write("schema_scan_output", scan)
        print("Scanner complete.")

def main():
    if len(sys.argv) < 2:
        print("Usage: python scanner.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)

    # Scanner is the first step, so schema_map might be None
    agent = ScannerAgent(schema_map=None, state=state)
    try:
        agent.run()
    except Exception as e:
        print(f"[ERROR] Scanner agent failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
