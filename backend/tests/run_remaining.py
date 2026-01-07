"""
Run Remaining Stress Tests
Executes the 6 remaining datasets that haven't been tested yet.
"""

import sys
import time
import json
from pathlib import Path
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from orchestrator import orchestrate_new_run, main_loop
from core.state_manager import StateManager

def analyze_run_results(run_path: Path, dataset_name: str) -> dict:
    state = StateManager(str(run_path))
    enhanced = state.read("enhanced_analytics") or {}
    
    signals = []
    
    # Check for specific signals based on dataset type
    
    # Correlation
    if "correlation" in dataset_name:
        corr = enhanced.get('correlation_analysis', {})
        strong = [c for c in corr.get('strong_correlations', []) if abs(c.get('pearson', 0)) > 0.99]
        if len(strong) > 0:
            signals.append(f"DETECTED_PERFECT_CORRELATIONS({len(strong)})")
            
    # Outliers
    if "outlier" in dataset_name:
        dist = enhanced.get('distribution_analysis', {})
        outliers = [k for k,v in dist.get('distributions', {}).items() if v.get('outlier_percentage', 0) > 10]
        if len(outliers) > 0:
            signals.append(f"DETECTED_OUTLIERS({len(outliers)} cols)")
            
    return {
        "dataset": dataset_name,
        "run_id": run_path.name,
        "status": "success",
        "signals": signals
    }

def run_remaining():
    # List of datasets to run
    targets = [
        "perfect_correlation.csv",
        "zero_variance.csv",
        "missing_data_hell.csv",
        "outlier_storm.csv",
        "time_series_chaos.csv",
        "type_confusion.csv"
    ]
    
    base_dir = Path("data/stress_tests")
    print(f"🚀 Starting Remaining {len(targets)} Tests...")
    
    results = []
    
    for filename in targets:
        dataset_path = base_dir / filename
        if not dataset_path.exists():
            print(f"⚠️  Skipping {filename} (not found)")
            continue
            
        print(f"\nTesting {filename}...")
        try:
            start_time = time.time()
            
            run_config = {
                "task_intent": {
                    "primary_question": f"Analyze {filename} for anomalies",
                    "confidence_threshold": 80,
                    "required_output_type": "descriptive"
                },
                "fast_mode": False
            }
            
            run_id, run_path_str = orchestrate_new_run(
                data_path=str(dataset_path),
                run_config=run_config
            )
            
            main_loop(run_path_str)
            duration = time.time() - start_time
            
            result = analyze_run_results(Path(run_path_str), filename)
            results.append(result)
            
            print(f"✅ Pass ({duration:.1f}s) | Signals: {result['signals']}")
            
        except Exception as e:
            print(f"❌ Fail: {e}")
            results.append({"dataset": filename, "status": "failed", "error": str(e)})

    # Save summary
    with open("data/stress_test_results/remaining_summary.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_remaining()
