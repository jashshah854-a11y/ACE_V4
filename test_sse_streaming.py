"""
Test the /api/ask/stream endpoint with SSE
"""
import requests
import json

API_BASE = "https://ace-v4-production.up.railway.app"
# API_BASE = "http://localhost:8000"

def test_streaming_ask():
    """Test SSE streaming endpoint"""
    print("=" * 60)
    print("Testing /api/ask/stream Endpoint (SSE)")
    print("=" * 60)
    
    # Use a known run_id
    run_id = "0cadffe6"
    
    payload = {
        "query": "What is the churn risk?",
        "context": "business_pulse",
        "evidence_type": "business_pulse",
        "run_id": run_id
    }
    
    print(f"\n[TEST] Streaming query: {payload['query']}")
    print(f"[TEST] Run ID: {run_id}")
    print("\n--- Stream Output ---\n")
    
    try:
        response = requests.post(
            f"{API_BASE}/api/ask/stream",
            json=payload,
            stream=True,  # Enable streaming
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"❌ FAILED: Status {response.status_code}")
            print(response.text)
            return
        
        # Process SSE stream
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                
                # SSE format: "data: {...}"
                if line_str.startswith('data: '):
                    data_str = line_str[6:]  # Remove "data: " prefix
                    
                    try:
                        data = json.loads(data_str)
                        event_type = data.get('type')
                        content = data.get('content')
                        
                        if event_type == 'step':
                            print(f"  🔍 Step: {content}")
                        elif event_type == 'thinking':
                            print(f"  💭 {content}")
                        elif event_type == 'token':
                            print(content, end='', flush=True)
                        elif event_type == 'done':
                            print(f"\n\n  ✅ Stream complete")
                        elif event_type == 'error':
                            print(f"\n  ❌ Error: {content}")
                    except json.JSONDecodeError:
                        print(f"  [Raw] {data_str}")
        
        print("\n\n--- End of Stream ---")
        
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    test_streaming_ask()
