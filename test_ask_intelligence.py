"""
Test the /api/ask endpoint with Anti-Wrapper verification
"""
import requests
import json

API_BASE = "https://ace-v4-production.up.railway.app"

def test_ask_endpoint():
    """Test /api/ask with grounding verification"""
    print("=" * 60)
    print("Testing /api/ask Endpoint (Anti-Wrapper)")
    print("=" * 60)
    
    # Use a known run_id from previous test
    run_id = "0cadffe6"  # From our earlier test
    
    # Test 1: Valid question about business pulse
    print("\n[TEST 1] Valid Question - Business Pulse")
    payload = {
        "query": "What is the churn risk?",
        "context": "business_pulse",
        "evidence_type": "business_pulse",
        "run_id": run_id
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/api/ask",
            json=payload,
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS")
            print(f"Answer: {data.get('answer', 'N/A')[:100]}...")
            print(f"Reasoning Steps: {len(data.get('reasoning_steps', []))}")
            print(f"Evidence Refs: {len(data.get('evidence_refs', []))}")
        else:
            print(f"❌ FAILED: {response.text}")
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    # Test 2: Hallucination Trap - Ask about missing data
    print("\n[TEST 2] Hallucination Trap - Missing Data")
    payload = {
        "query": "What is the exact revenue for Q4 2025?",
        "context": "business_pulse",
        "evidence_type": "business_pulse",
        "run_id": run_id
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/api/ask",
            json=payload,
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            answer = data.get('answer', '')
            
            # Check if it admits missing data (PASS) or hallucinates (FAIL)
            if any(word in answer.lower() for word in ['cannot', 'missing', 'not available', 'no data']):
                print(f"✅ PASS - Correctly identified missing data")
                print(f"Answer: {answer[:150]}...")
            else:
                print(f"⚠️ POTENTIAL HALLUCINATION")
                print(f"Answer: {answer[:150]}...")
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    test_ask_endpoint()
