"""
Bulk Stress Test Runner - Direct Pipeline

Executes the ACE pipeline directly (bypassing API/Redis) on all synthetic datasets.
Captures failures, anomalies, and potential "Dark Data" insights.
"""

import sys
import glob
import json
import time
import traceback
from pathlib import Path
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from orchestrator import orchestrate_new_run, main_loop
from core.state_manager import StateManager

def analyze_run_results(run_path: Path, dataset_name: str) -> dict:
    state = StateManager(str(run_path))
    enhanced = state.read("enhanced_analytics") or {}
    
    # Check for "Dark Data" signals
    signals = []
    
    # Business Intel
    bi = enhanced.get('business_intelligence', {})
    if bi.get('churn_risk', {}).get('at_risk_percentage', 0) > 50:
        signals.append("HIGH_CHURN_RISK")
    if bi.get('value_metrics', {}).get('value_concentration', 0) > 0.8:
        signals.append("HIGH_VALUE_CONCENTRATION")
        
    # Correlations
    corr = enhanced.get('correlation_analysis', {})
    strong_corrs = [c for c in corr.get('strong_correlations', []) if abs(c.get('pearson', 0)) > 0.99]
    if len(strong_corrs) > 0:
        signals.append(f"PERFECT_CORRELATIONS_DETECTED({len(strong_corrs)})")
        
    return {
        "dataset": dataset_name,
        "run_id": run_path.name,
        "status": "success",
        "enhanced_analytics_captured": bool(enhanced),
        "dark_data_signals": signals,
        "run_path": str(run_path)
    }

def run_stress_suite():
    data_dir = Path("data/stress_tests")
    datasets = list(data_dir.glob("*.csv"))
    
    print(f"🚀 Starting Stress Suite on {len(datasets)} datasets...")
    
    results = []
    
    for i, dataset in enumerate(datasets):
        print(f"\n[{i+1}/{len(datasets)}] Testing {dataset.name}...")
        
        try:
            # Configure run
            run_config = {
                "task_intent": {
                    "primary_question": f"Analyze {dataset.name} for anomalies and insights",
                    "confidence_threshold": 80,
                    "required_output_type": "descriptive"
                },
                "fast_mode": False
            }
            
            # Start Run
            start_time = time.time()
            run_id, run_path_str = orchestrate_new_run(
                data_path=str(dataset),
                run_config=run_config
            )
            
            # Execute Pipeline
            main_loop(run_path_str)
            duration = time.time() - start_time
            
            # Analyze Result
            result = analyze_run_results(Path(run_path_str), dataset.name)
            result['duration_seconds'] = round(duration, 2)
            results.append(result)
            
            print(f"✅ Completed in {duration:.1f}s")
            print(f"   Signals: {result['dark_data_signals']}")
            
        except Exception as e:
            print(f"❌ Failed: {e}")
            # traceback.print_exc()
            results.append({
                "dataset": dataset.name,
                "status": "failed",
                "error": str(e)
            })
            
    # Save Final Report
    report_path = Path("data/stress_test_results/final_suite_report.json")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(report_path, 'w') as f:
        json.dump(results, f, indent=2)
        
    print(f"\n🏁 Suite Complete. Report saved to {report_path}")
    
    # Summary
    success_count = sum(1 for r in results if r['status'] == 'success')
    print(f"Summary: {success_count}/{len(datasets)} passed.")

if __name__ == "__main__":
    run_stress_suite()
