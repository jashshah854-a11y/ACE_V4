"""
Operation Unsinkable - Fail-Safe Verification Script

Tests that the system NEVER crashes and always returns 200 OK with Safe Mode
when analysis fails.

Usage:
    python verify_failsafe.py
"""

import requests
import pandas as pd
import io

API_BASE = "http://localhost:8000"

def test_normal_operation():
    """Test 1: Normal CSV should work"""
    print("\n=== TEST 1: Normal Operation ===")
    df = pd.DataFrame({"A": [1, 2, 3], "B": [4, 5, 6]})
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)
    
    try:
        files = {"file": ("test.csv", csv_buffer, "text/csv")}
        response = requests.post(f"{API_BASE}/runs/preview", files=files)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Normal operation successful")
            print(f"   Status Code: {response.status_code}")
            print(f"   Row Count: {data.get('row_count')}")
            print(f"   Quality Score: {data.get('quality_score')}")
        else:
            print(f"❌ Unexpected status: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Test failed: {e}")


def test_problematic_data():
    """Test 2: Problematic data (mixed types, heavy nulls)"""
    print("\n=== TEST 2: Problematic Data (Safe Mode Trigger) ===")
    
    # Create data that might cause profiling issues
    problematic_data = {
        "mixed": [1, "two", 3.0, None, True, "six", 7, None],
        "nulls": [None, None, None, None, None, None, None, 1],
        "normal": [1, 2, 3, 4, 5, 6, 7, 8]
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
            print(f"✅ Scan succeeded (Safe Mode if needed)")
            print(f"   Status Code: {response.status_code}")
            print(f"   Quality Score: {data.get('quality_score')}")
            print(f"   Mode: {data.get('mode', 'normal')}")
            
            if data.get('quality_score', 1.0) == 0.0:
                print(f"   ⚠️ Safe Mode activated")
                print(f"   Error Log: {data.get('error_log', 'N/A')[:100]}")
        else:
            print(f"❌ FAIL: Got status {response.status_code} (should be 200)")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Test failed: {e}")


def test_corrupted_file():
    """Test 3: Completely corrupted file"""
    print("\n=== TEST 3: Corrupted File (Ultimate Fail-Safe) ===")
    
    # Send garbage data
    corrupted_data = b"This is not a valid CSV\x00\xff\xfe\nGarbage data!!!"
    
    try:
        files = {"file": ("corrupted.csv", corrupted_data, "text/csv")}
        response = requests.post(f"{API_BASE}/runs/preview", files=files)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ CRITICAL SUCCESS: System did not crash!")
            print(f"   Status Code: {response.status_code}")
            print(f"   Mode: {data.get('mode', 'unknown')}")
            print(f"   Quality Score: {data.get('quality_score')}")
            print(f"   Warnings: {len(data.get('warnings', []))} warnings")
            
            if data.get('mode') == 'safe_mode':
                print(f"   ✅ Safe Mode correctly activated")
            else:
                print(f"   ⚠️ Unexpected mode: {data.get('mode')}")
        else:
            print(f"❌ CRITICAL FAIL: Got {response.status_code} instead of 200")
            print(f"   The system crashed instead of entering Safe Mode!")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Test failed: {e}")


def test_unsupported_extension():
    """Test 4: Unsupported file extension (should get clear 422)"""
    print("\n=== TEST 4: Unsupported Extension ===")
    
    try:
        files = {"file": ("test.pdf", b"fake pdf", "application/pdf")}
        response = requests.post(f"{API_BASE}/runs/preview", files=files)
        
        if response.status_code == 422:
            data = response.json()
            print(f"✅ Correctly rejected with 422")
            print(f"   Message: {data.get('detail', {}).get('message', 'N/A')}")
        elif response.status_code == 200:
            print(f"⚠️ Accepted unsupported file (might be too permissive)")
        else:
            print(f"❌ Unexpected status: {response.status_code}")
    except Exception as e:
        print(f"❌ Test failed: {e}")


def main():
    """Run all fail-safe verification tests"""
    print("=" * 70)
    print("OPERATION UNSINKABLE - Fail-Safe Verification")
    print("=" * 70)
    print(f"\nTarget: {API_BASE}")
    print("\nTesting that the system NEVER crashes...")
    
    test_normal_operation()
    test_problematic_data()
    test_corrupted_file()
    test_unsupported_extension()
    
    print("\n" + "=" * 70)
    print("Verification Complete")
    print("=" * 70)
    print("\n✅ SUCCESS CRITERIA:")
    print("   - All tests return 200 OK (except unsupported extension)")
    print("   - Corrupted files trigger Safe Mode (not 500 errors)")
    print("   - Error messages are clear and actionable")


if __name__ == "__main__":
    main()
