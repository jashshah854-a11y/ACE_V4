"""
Run Auditor - Extracts insights from recent ACE runs.
"""

import sys
import json
import glob
from pathlib import Path
from datetime import datetime
import pandas as pd

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.state_manager import StateManager

def get_recent_runs(limit=10):
    run_dir = Path("data/runs")
    runs = []
    
    for path in run_dir.iterdir():
        if path.is_dir():
            try:
                # Get creation time from folder name or stats
                ts = path.stat().st_mtime
                runs.append({
                    "path": path,
                    "timestamp": ts,
                    "id": path.name
                })
            except:
                pass
                
    # Sort by timestamp desc
    return sorted(runs, key=lambda x: x["timestamp"], reverse=True)[:limit]

def analyze_run(run_path: Path):
    state = StateManager(str(run_path))
    
    # Metadata
    dataset_name = "Unknown"
    active_dataset = state.read("active_dataset")
    if active_dataset:
        dataset_name = Path(active_dataset.get("path", "")).name
        
    # Status
    # check if final report exists
    status = "running/failed"
    if (run_path / "final_report.md").exists():
        status = "completed"
    
    # Enhanced Analytics
    enhanced = state.read("enhanced_analytics") or {}
    
    insights = []
    
    # 1. Feature Importance Check (for High Dim)
    fi = enhanced.get('feature_importance', {})
    top_features = []
    if fi.get('available'):
        features = fi.get('feature_importance', [])
        top_features = [f['feature'] for f in features[:5]]
        
        # Check if 'meaningful' features found in high dim
        meaningful = ['revenue', 'age', 'tenure_months', 'satisfaction', 'churn']
        found = [f for f in top_features if any(m in f for m in meaningful)]
        if len(found) > 0 and "high_dim" in dataset_name:
            insights.append(f"High-Dim Success: Found {len(found)} meaningful features: {found}")
            
    # 2. Churn Risk (for Imbalance)
    bi = enhanced.get('business_intelligence', {})
    churn_risk = bi.get('churn_risk', {}).get('at_risk_percentage')
    if churn_risk is not None:
        insights.append(f"Churn Risk: {churn_risk:.1f}%")
        
    return {
        "run_id": run_path.name,
        "dataset": dataset_name,
        "status": status,
        "top_features": top_features,
        "insights": insights,
        "enhanced_analytics_available": bool(enhanced)
    }

def main():
    print("="*60)
    print("ACE V4 - Run Auditor")
    print("="*60)
    
    runs = get_recent_runs(10)
    print(f"Found {len(runs)} recent runs\n")
    
    results = []
    
    for run in runs:
        try:
            analysis = analyze_run(run["path"])
            results.append(analysis)
            
            print(f"Run: {analysis['run_id']}")
            print(f"  Dataset: {analysis['dataset']}")
            print(f"  Status: {analysis['status']}")
            if analysis['insights']:
                print("  Insights:")
                for i in analysis['insights']:
                    print(f"    - {i}")
            print("-" * 40)
        except Exception as e:
            print(f"Error analyzing {run['id']}: {e}")
            
    # Save report
    with open("data/stress_test_results/audit_report.json", 'w') as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    main()
