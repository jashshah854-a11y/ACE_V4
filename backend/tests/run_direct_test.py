"""
Direct Pipeline Test - Bypasses API server, runs ACE orchestrator directly

This validates the core analytics engine without requiring Redis/API infrastructure.
"""

import sys
from pathlib import Path
import json
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from orchestrator import orchestrate_new_run, main_loop
from core.state_manager import StateManager

def run_direct_test(dataset_path: Path):
    """Run ACE pipeline directly on a dataset."""
    
    print("="*60)
    print("ACE V4 - Direct Pipeline Test")
    print("="*60)
    print(f"Dataset: {dataset_path.name}")
    print("="*60)
    
    # Create run directory
    run_id = f"stress_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    run_path = Path("data/runs") / run_id
    run_path.mkdir(parents=True, exist_ok=True)
    
    print(f"\n📁 Run directory: {run_path}")
    print(f"🆔 Run ID: {run_id}")
    
    # Run pipeline
    print(f"\n🚀 Starting pipeline...")
    try:
        # Create run config
        run_config = {
            "task_intent": {
                "primary_question": "Analyze this dataset for patterns and insights",
                "confidence_threshold": 80,
                "required_output_type": "descriptive"
            },
            "fast_mode": False
        }
        
        # Initialize run
        run_id, run_path_str = orchestrate_new_run(
            data_path=str(dataset_path),
            run_config=run_config
        )
        
        run_path = Path(run_path_str)
        print(f"📁 Run directory: {run_path}")
        print(f"🆔 Run ID: {run_id}")
        
        # Execute pipeline
        main_loop(str(run_path))
        
        print(f"✅ Pipeline completed successfully!")
        
        # Load state
        state = StateManager(str(run_path))
        
        # Extract key metrics
        print(f"\n📊 Results:")
        
        # Enhanced Analytics
        enhanced_analytics = state.read("enhanced_analytics") or {}
        
        if enhanced_analytics:
            print(f"\n🔬 Enhanced Analytics Modules:")
            
            # Business Intelligence
            bi = enhanced_analytics.get('business_intelligence', {})
            if bi.get('available'):
                print(f"  ✓ Business Intelligence")
                if bi.get('churn_risk'):
                    churn = bi['churn_risk']
                    print(f"    - Churn Risk: {churn.get('at_risk_percentage', 0):.1f}%")
                if bi.get('value_metrics'):
                    vm = bi['value_metrics']
                    print(f"    - Value Concentration (Gini): {vm.get('value_concentration', 0):.3f}")
            
            # Feature Importance
            fi = enhanced_analytics.get('feature_importance', {})
            if fi.get('available'):
                print(f"  ✓ Feature Importance")
                features = fi.get('feature_importance', [])
                if features:
                    top = features[0]
                    print(f"    - Top Feature: {top.get('feature')} ({top.get('importance', 0):.3f})")
            
            # Correlation Analysis
            corr = enhanced_analytics.get('correlation_analysis', {})
            if corr.get('available'):
                print(f"  ✓ Correlation Analysis")
                strong = corr.get('strong_correlations', [])
                perfect = [c for c in strong if abs(c.get('pearson', 0)) > 0.99]
                if perfect:
                    print(f"    - Perfect Correlations: {len(perfect)}")
            
            # Distribution Analysis
            dist = enhanced_analytics.get('distribution_analysis', {})
            if dist.get('available'):
                print(f"  ✓ Distribution Analysis")
                distributions = dist.get('distributions', {})
                high_outliers = [k for k, v in distributions.items() if v.get('outlier_percentage', 0) > 20]
                if high_outliers:
                    print(f"    - High Outlier Columns: {len(high_outliers)}")
        
        # Save test result
        result_file = Path("data/stress_test_results") / f"{dataset_path.stem}_direct_test.json"
        result_file.parent.mkdir(parents=True, exist_ok=True)
        
        test_result = {
            "timestamp": datetime.now().isoformat(),
            "dataset": dataset_path.name,
            "run_id": run_id,
            "run_path": str(run_path),
            "pipeline_success": True,
            "enhanced_analytics": enhanced_analytics
        }
        
        with open(result_file, 'w') as f:
            json.dump(test_result, f, indent=2)
        
        print(f"\n💾 Results saved to: {result_file}")
        
        return test_result
        
    except Exception as e:
        print(f"\n❌ Pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        
        result_file = Path("data/stress_test_results") / f"{dataset_path.stem}_direct_test.json"
        result_file.parent.mkdir(parents=True, exist_ok=True)
        
        test_result = {
            "timestamp": datetime.now().isoformat(),
            "dataset": dataset_path.name,
            "run_id": run_id,
            "pipeline_success": False,
            "error": str(e)
        }
        
        with open(result_file, 'w') as f:
            json.dump(test_result, f, indent=2)
        
        return test_result

if __name__ == "__main__":
    # Test with extreme_imbalance dataset
    dataset_path = Path("data/stress_tests/extreme_imbalance.csv")
    
    if not dataset_path.exists():
        print(f"❌ Dataset not found: {dataset_path}")
        sys.exit(1)
    
    result = run_direct_test(dataset_path)
    
    print(f"\n{'='*60}")
    print(f"✅ TEST COMPLETE")
    print(f"{'='*60}")
    
    if result['pipeline_success']:
        print(f"\n✓ Pipeline executed successfully")
        print(f"✓ Enhanced analytics captured")
        print(f"\nNext: Run full test suite with all 9 datasets")
    else:
        print(f"\n✗ Pipeline failed - see error above")
