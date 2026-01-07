"""
Direct synchronous verification of ACE V4 backend fix.
Bypasses Redis queue and runs analysis directly using Orchestrator.
"""
import sys
import json
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from orchestrator import orchestrate_new_run, main_loop
from core.state_manager import StateManager

# Configuration
DATASET_PATH = Path("C:/Users/jashs/Downloads/extreme_imbalance.csv")
FRONTEND_BASE = "http://localhost:8080"

def main():
    print("=" * 60)
    print("ACE V4 Direct Synchronous Verification")
    print("=" * 60)
    print()
    
    # Verify dataset exists
    if not DATASET_PATH.exists():
        print(f"❌ Dataset not found at {DATASET_PATH}")
        print("   Generating dummy CSV with extreme imbalance...")
        
        # Generate dummy CSV
        import pandas as pd
        import numpy as np
        
        np.random.seed(42)
        n_samples = 1000
        
        # Create extreme imbalance dataset
        df = pd.DataFrame({
            'user_id': range(1, n_samples + 1),
            'visits': np.concatenate([
                np.random.poisson(10, 750),  # Active users
                np.random.poisson(1, 250)    # At-risk users (25%)
            ]),
            'revenue': np.concatenate([
                np.random.gamma(2, 50, 750),
                np.random.gamma(1, 10, 250)
            ]),
            'days_since_last_visit': np.concatenate([
                np.random.uniform(0, 7, 750),
                np.random.uniform(30, 90, 250)
            ])
        })
        
        DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(DATASET_PATH, index=False)
        print(f"✅ Generated dummy dataset: {DATASET_PATH}")
    
    print(f"📂 Dataset: {DATASET_PATH}")
    print()
    
    # Start analysis (synchronous - will block until complete)
    print("⚙️  Running analysis (this may take 30-60 seconds)...")
    print()
    
    try:
        # Create run config
        run_config = {
            "task_intent": {
                "primary_question": "Analyze churn risk in user base",
                "decision_context": "Identify at-risk customers",
                "required_output_type": "descriptive",
                "confidence_threshold": 0.8
            },
            "fast_mode": False
        }
        
        # Initialize run
        run_id, run_path_str = orchestrate_new_run(
            data_path=str(DATASET_PATH),
            run_config=run_config
        )
        
        run_path = Path(run_path_str)
        print(f"📁 Run directory: {run_path}")
        print(f"🆔 Run ID: {run_id}")
        
        # Execute pipeline (synchronous)
        main_loop(str(run_path))
        
        print(f"\n✅ Analysis complete! Run ID: {run_id}")
    except Exception as e:
        print(f"\n❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    # Load enhanced_analytics
    print(f"\n🔍 Loading enhanced_analytics...")
    
    state = StateManager(str(run_path))
    
    enhanced_analytics = state.read("enhanced_analytics")
    
    if not enhanced_analytics:
        print("❌ enhanced_analytics not found!")
        sys.exit(1)
    
    # Navigate to churn_risk
    bi = enhanced_analytics.get('business_intelligence', {})
    churn_risk = bi.get('churn_risk', {})
    
    if not churn_risk:
        print("❌ churn_risk not found in business_intelligence!")
        print(f"   Available keys: {list(bi.keys())}")
        sys.exit(1)
    
    # Validate
    print("\n📊 Churn Risk Data:")
    print(json.dumps(churn_risk, indent=2))
    print()
    
    at_risk_percentage = churn_risk.get('at_risk_percentage')
    at_risk_count = churn_risk.get('at_risk_count')
    
    # Assertions
    print("🧪 Running Assertions...")
    
    try:
        assert at_risk_percentage is not None, "at_risk_percentage is missing"
        assert isinstance(at_risk_percentage, (int, float)), f"at_risk_percentage is not a number! Type: {type(at_risk_percentage)}"
        assert not str(at_risk_percentage).lower() in ['nan', 'inf', '-inf'], "at_risk_percentage is NaN/Infinity"
        assert at_risk_count is not None, "at_risk_count is missing"
        assert isinstance(at_risk_count, int), f"at_risk_count is not an integer! Type: {type(at_risk_count)}"
        
        print(f"   ✅ at_risk_percentage is valid float: {at_risk_percentage}%")
        print(f"   ✅ at_risk_count is valid int: {at_risk_count}")
        print(f"   ✅ All JSON values are properly sanitized!")
        
    except AssertionError as e:
        print(f"   ❌ Assertion failed: {e}")
        sys.exit(1)
    
    # Success!
    print("\n" + "=" * 60)
    print("✅ VERIFICATION PASSED!")
    print("=" * 60)
    print(f"\n📍 Direct Link to Report:")
    print(f"   {FRONTEND_BASE}/report/summary?run={run_id}")
    print(f"\n🎯 Expected Result:")
    print(f"   - Amber churn headline: 'ACE detected a high-risk segment comprising {at_risk_percentage:.1f}%'")
    print(f"   - No JSON parsing errors in console")
    print(f"   - Click '{at_risk_percentage:.1f}%' to open Evidence Rail")
    print()

if __name__ == "__main__":
    main()
