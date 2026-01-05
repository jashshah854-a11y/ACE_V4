"""
Test the /run/{run_id}/simulate endpoint
"""
import requests
import json

API_BASE = "https://ace-v4-production.up.railway.app"
# API_BASE = "http://localhost:8000"

def test_simulation():
    """Test What-If simulation endpoint"""
    print("=" * 60)
    print("Testing /run/{run_id}/simulate Endpoint")
    print("=" * 60)
    
    # Use a known run_id from previous tests
    run_id = "0cadffe6"  # Replace with actual run_id
    
    # Test 1: Simulate price increase
    print("\n[TEST 1] Simulate 10% Price Increase")
    payload = {
        "target_column": "price",
        "modification_factor": 1.1
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/run/{run_id}/simulate",
            json=payload,
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if "error" in data:
                print(f"❌ Simulation failed: {data.get('message')}")
                print(f"Error: {data.get('error')}")
            else:
                print(f"✅ SUCCESS")
                print(f"Modification: {data['modification']['description']}")
                
                if 'churn_risk' in data.get('delta', {}):
                    churn = data['delta']['churn_risk']
                    print(f"\nChurn Risk Delta:")
                    print(f"  Original: {churn['original']}%")
                    print(f"  Simulated: {churn['simulated']}%")
                    print(f"  Delta: {churn['delta']}% ({churn['delta_direction']})")
                else:
                    print("\nNo churn risk delta available")
        else:
            print(f"❌ FAILED: {response.text}")
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    # Test 2: Simulate activity decrease
    print("\n[TEST 2] Simulate 20% Activity Decrease")
    payload = {
        "target_column": "activity",
        "modification_factor": 0.8
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/run/{run_id}/simulate",
            json=payload,
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if "error" in data:
                print(f"⚠️ Simulation failed (expected if column doesn't exist)")
                print(f"Message: {data.get('message')}")
            else:
                print(f"✅ SUCCESS")
                print(f"Delta: {json.dumps(data.get('delta', {}), indent=2)}")
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    test_simulation()
