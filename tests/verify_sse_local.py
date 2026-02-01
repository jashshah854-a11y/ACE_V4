import requests
import json
import time

API_URL = "http://localhost:8000/api/ask/stream"

def test_sse_stream():
    print(f"Testing SSE Stream at {API_URL}...")
    
    # Payload
    payload = {
        "query": "What are the key drivers?",
        "run_id": "test_run_id",
        "evidence_type": "business_pulse"
    }
    
    try:
        with requests.post(API_URL, json=payload, stream=True) as response:
            if response.status_code != 200:
                print(f"FAILED: Status code {response.status_code}")
                print(response.text)
                return

            print("Connection established. Reading stream...")
            start_time = time.time()
            
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith("data: "):
                        data_str = decoded_line[6:]
                        try:
                            data = json.loads(data_str)
                            event_type = data.get("type")
                            content = data.get("content")
                            print(f"[Time: {time.time() - start_time:.2f}s] Type: {event_type} | Content: {str(content)[:50]}...")
                        except json.JSONDecodeError:
                            print(f"FAILED: Invalid JSON: {data_str}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_sse_stream()
