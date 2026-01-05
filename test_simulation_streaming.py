"""
Test the /run/{run_id}/simulate/stream endpoint with SSE
"""
import requests
import json

API_BASE = "https://ace-v4-production.up.railway.app"
# API_BASE = "http://localhost:8000"

def test_simulation_streaming():
    """Test SSE streaming simulation endpoint"""
    print("=" * 60)
    print("Testing /run/{run_id}/simulate/stream Endpoint (SSE)")
    print("=" * 60)
    
    # Use a known run_id
    run_id = "0cadffe6"
    
    payload = {
        "target_column": "price",
        "modification_factor": 1.1  # 10% increase
    }
    
    print(f"\n[TEST] Simulating: {payload['target_column']} x {payload['modification_factor']}")
    print(f"[TEST] Run ID: {run_id}")
    print("\n--- Stream Output ---\n")
    
    try:
        response = requests.post(
            f"{API_BASE}/run/{run_id}/simulate/stream",
            json=payload,
            stream=True,
            timeout=60
        )
        
        if response.status_code != 200:
            print(f"❌ FAILED: Status {response.status_code}")
            print(response.text)
            return
        
        # Process SSE stream
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                
                if line_str.startswith('data: '):
                    data_str = line_str[6:]
                    
                    try:
                        data = json.loads(data_str)
                        event_type = data.get('type')
                        content = data.get('content')
                        
                        if event_type == 'progress':
                            print(f"  🔄 {content}")
                        elif event_type == 'result':
                            print(f"\n  ✅ RESULT:")
                            print(f"     Modification: {content['modification']['description']}")
                            if 'churn_risk' in content.get('delta', {}):
                                churn = content['delta']['churn_risk']
                                print(f"     Churn Risk: {churn['original']}% → {churn['simulated']}%")
                                print(f"     Delta: {churn['delta']}% ({churn['delta_direction']})")
                        elif event_type == 'error':
                            print(f"\n  ❌ Error: {content}")
                    except json.JSONDecodeError:
                        print(f"  [Raw] {data_str}")
        
        print("\n\n--- End of Stream ---")
        
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    test_simulation_streaming()
