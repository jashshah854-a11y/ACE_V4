"""
Verification Script for Dataset Scan Resilience

Tests the 3-layer fix to ensure:
1. Network connectivity works (Build Trap fix)
2. File type validation is clear (Gatekeeper fix)  
3. Profiling fails gracefully (Fail-Safe fix)

Usage:
    python verification_script.py
"""

import requests
import pandas as pd
import io
import json

# Configuration
API_BASE = "http://localhost:8000"  # Change to Railway URL for production test

def test_phase_1_network():
    """Test Phase 1: Network connectivity"""
    print("\n=== PHASE 1: Network & Connectivity Test ===")
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Network connection successful")
            return True
        else:
            print(f"❌ Network connection failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Network connection error: {e}")
        return False


def test_phase_2_gatekeeper():
    """Test Phase 2: File type validation with clear error messages"""
    print("\n=== PHASE 2: Gatekeeper (File Validation) Test ===")
    
    # Test 1: Valid file type (CSV)
    print("\nTest 2.1: Valid CSV file")
    df = pd.DataFrame({"A": [1, 2, 3], "B": [4, 5, 6]})
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)
    
    try:
        files = {"file": ("test.csv", csv_buffer, "text/csv")}
        response = requests.post(f"{API_BASE}/runs/preview", files=files)
        if response.status_code == 200:
            print("✅ Valid CSV accepted")
        else:
            print(f"❌ Valid CSV rejected: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ CSV upload error: {e}")
    
    # Test 2: Invalid file type (should get clear error)
    print("\nTest 2.2: Invalid file type (.pdf)")
    try:
        files = {"file": ("test.pdf", b"fake pdf content", "application/pdf")}
        response = requests.post(f"{API_BASE}/runs/preview", files=files)
        if response.status_code == 422:
            error_data = response.json()
            print("✅ Invalid file type rejected with clear error:")
            print(f"   Message: {error_data.get('detail', {}).get('message')}")
            print(f"   Allowed: {error_data.get('detail', {}).get('allowed_types')}")
        else:
            print(f"❌ Unexpected response: {response.status_code}")
    except Exception as e:
        print(f"❌ Error test failed: {e}")


def test_phase_3_failsafe():
    """Test Phase 3: Profiling fail-safe with problematic data"""
    print("\n=== PHASE 3: Fail-Safe (Self-Healing) Test ===")
    
    # Create a "broken" CSV with mixed types that might cause profiling issues
    print("\nTest 3.1: Problematic data (mixed types, nulls)")
    problematic_data = {
        "mixed_col": [1, "two", 3.0, None, True, "six"],
        "null_heavy": [None, None, None, 1, None, None],
        "normal_col": [1, 2, 3, 4, 5, 6]
    }
    df = pd.DataFrame(problematic_data)
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)
    
    try:
        files = {"file": ("problematic.csv", csv_buffer, "text/csv")}
        response = requests.post(f"{API_BASE}/runs/preview", files=files)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Scan succeeded (even with problematic data)")
            print(f"   Quality Score: {data.get('quality_score', 'N/A')}")
            print(f"   Row Count: {data.get('row_count', 'N/A')}")
            print(f"   Column Count: {data.get('column_count', 'N/A')}")
            
            # Check if it's in safe mode
            if data.get('quality_score', 1.0) == 0.0:
                print("   ⚠️ Safe Mode activated (as expected for problematic data)")
        else:
            print(f"❌ Scan failed with status {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Fail-safe test error: {e}")


def main():
    """Run all verification tests"""
    print("=" * 60)
    print("ACE V4 - Dataset Scan Resilience Verification")
    print("=" * 60)
    print(f"\nTesting against: {API_BASE}")
    
    # Run all phases
    phase1_pass = test_phase_1_network()
    
    if phase1_pass:
        test_phase_2_gatekeeper()
        test_phase_3_failsafe()
    else:
        print("\n⚠️ Skipping Phase 2 & 3 tests (network connection failed)")
    
    print("\n" + "=" * 60)
    print("Verification Complete")
    print("=" * 60)


if __name__ == "__main__":
    main()
