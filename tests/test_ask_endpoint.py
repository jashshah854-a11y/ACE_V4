import requests
import json
import os

# Configuration
API_URL = "http://localhost:8000"  # or 8001, try both
RUN_ID = "fbb66cdd"  # Taking one from the directory list if available

payload = {
    "query": "What are the drivers of churn?",
    "context": "business_pulse",
    "evidence_type": "business_pulse",
    "run_id": RUN_ID
}

try:
    print(f"Testing {API_URL}/api/ask with run_id={RUN_ID}...")
    response = requests.post(f"{API_URL}/api/ask", json=payload)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Response:", json.dumps(response.json(), indent=2))
    else:
        print("Error:", response.text)
        # Try port 8001 if 8000 failed
        print("Retrying on port 8001...")
        API_URL = "http://localhost:8001"
        response = requests.post(f"{API_URL}/api/ask", json=payload)
        print(f"Status: {response.status_code}")
        print("Response:", json.dumps(response.json(), indent=2))

except Exception as e:
    print(f"Exception: {e}")
