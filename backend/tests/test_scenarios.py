import sys
import os
import json
from pathlib import Path
import pytest

pytestmark = pytest.mark.skip(reason="Legacy scenario test requires fixtures/inputs not available in current pipeline.")

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ace_v3_entry import run_ace_v3

def check_run_artifacts(run_path):
    path = Path(run_path)
    required = [
        "schema_scan_output.json",
        "schema_map.json",
        "overseer_output.json",
        "personas_output.json",
        "final_report.md"
    ]
    missing = []
    for f in required:
        if not (path / f).exists():
            missing.append(f)
    return missing

def test_scenario(name, csv_file):
    print(f"\n--- Running Test: {name} ({csv_file}) ---")
    data_path = f"data/{csv_file}"
    
    try:
        run_id, run_path = run_ace_v3(data_path)
        print(f"Run finished: {run_id}")
        
        missing = check_run_artifacts(run_path)
        if missing:
            print(f"FAILED: Missing artifacts: {missing}")
        else:
            print("PASSED: All artifacts created.")
            
    except Exception as e:
        print(f"FAILED: Engine crashed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Test 1: Universal Schema (Ecommerce)
    test_scenario("Universal Schema (Ecommerce)", "test_ecommerce.csv")
    
    # Test 2: Dirty Dataset
    test_scenario("Dirty Dataset Robustness", "test_dirty.csv")
    
    # Test 5: Overseer NaN Crash
    test_scenario("Overseer NaN Handling", "test_nan.csv")
    
    # Test 6: Schema Interpreter Fallback
    test_scenario("Schema Fallback (Weird Data)", "test_weird.csv")
    
    # Test 7: Full Chain Integration
    test_scenario("Full Chain Integration", "test_full.csv")
