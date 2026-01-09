import requests
import json
import os
import time

# Local Backend (from logs)
API_BASE = "http://localhost:8080"
FILE_PATH = "C:\\Users\\jashs\\Projects\\ACE_V4\\a_steam_data_2021_2025.csv"

def run_analysis():
    print("=" * 60)
    print(f"Triggering Analysis for: {FILE_PATH}")
    print("=" * 60)

    if not os.path.exists(FILE_PATH):
        print(f"❌ Error: File not found at {FILE_PATH}")
        return

    # Task Intent (Standard Diagnostic)
    task_intent = {
        "primaryQuestion": "Run a comprehensive analysis of this dataset, identifying key drivers, anomalies, and segments.",
        "decisionContext": "User requested manual run.",
        "requiredOutputType": "diagnostic",
        "successCriteria": "Comprehensive report",
        "constraints": "",
        "confidenceThreshold": 80,
        "confidenceAcknowledged": True
    }

    try:
        # Open file in binary mode
        with open(FILE_PATH, 'rb') as f:
            files = {'file': (os.path.basename(FILE_PATH), f, 'text/csv')}
            data = {
                'task_intent': json.dumps(task_intent),
                'confidence_acknowledged': 'true'
            }
            
            print(f"Sending request to {API_BASE}/run...")
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/run",
                files=files,
                data=data,
                timeout=120  # Give it time to upload big files
            )
            
            print(f"Response Time: {time.time() - start_time:.2f}s")
            print(f"Status Code: {response.status_code}")

            if response.status_code == 200:
                result = response.json()
                run_id = result.get('run_id')
                print(f"✅ SUCCESS! Run started w/ ID: {run_id}")
                print(f"Monitor at: {API_BASE}/run/{run_id}/status")
            else:
                print(f"❌ FAILED: {response.text}")

    except Exception as e:
        print(f"❌ Request Error: {e}")

if __name__ == "__main__":
    run_analysis()
