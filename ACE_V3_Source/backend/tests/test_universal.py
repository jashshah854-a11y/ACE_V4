import sys
import os
from pathlib import Path

import pytest

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from ace_v3_entry import run_ace_v3

def run_test(dataset_path, test_name):
    print(f"\n=== Running Test: {test_name} ===")
    print(f"Dataset: {dataset_path}")
    
    if not os.path.exists(dataset_path):
        print(f"[FAIL] Dataset not found: {dataset_path}")
        return False
        
    try:
        run_id, run_path = run_ace_v3(dataset_path)
        report_path = os.path.join(run_path, "final_report.md")
        
        if os.path.exists(report_path):
            with open(report_path, "r", encoding="utf-8") as f:
                content = f.read()
                
            if "ACE Customer Intelligence Report" in content:
                print(f"[PASS] {test_name} -> Report generated and valid.")
                
                # Check for fallback indicators if expected
                if "Fallback Mode Active" in content:
                    print(f"       (Note: Fallback Mode was active)")
                return True
            else:
                print(f"[FAIL] {test_name} -> Report missing header.")
                return False
        else:
            print(f"[FAIL] {test_name} -> No report found.")
            return False
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[FAIL] {test_name} -> Crashed: {repr(e)}")
        return False
def _run_or_skip(path: str, name: str):
    if not os.path.exists(path):
        pytest.skip(f"Dataset not found: {path}")
    assert run_test(path, name)


def test_banking_data():
    _run_or_skip("data/test_sets/banking_tiny.csv", "Banking Data")

def test_ecommerce_data():
    _run_or_skip("data/test_sets/ecommerce_small.csv", "Ecommerce Data")

def test_telecom_data():
    _run_or_skip("data/test_sets/telecom_churn_small.csv", "Telecom Data")

def test_random_data():
    _run_or_skip("data/test_sets/random_generic.csv", "Random Data")

def test_minimal_data():
    _run_or_skip("data/test_sets/minimal.csv", "Minimal Data")

if __name__ == "__main__":
    tests = [
        test_banking_data,
        test_ecommerce_data,
        test_telecom_data,
        test_random_data,
        test_minimal_data
    ]
    
    results = []
    for test in tests:
        results.append(test())
        
    print("\n=== Final Test Summary ===")
    if all(results):
        print("ALL TESTS PASSED")
        sys.exit(0)
    else:
        print("SOME TESTS FAILED")
        sys.exit(1)
