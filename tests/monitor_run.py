import requests
import time
import json
import sys

run_id = input("Enter run ID to monitor: ") if len(sys.argv) < 2 else sys.argv[1]
url = f"http://localhost:8001/runs/{run_id}/state"

print(f"Monitoring run {run_id}...")
print(f"Open http://localhost:8080/report/{run_id} in your browser to see the UI\n")

previous_step = None
iteration = 0

while iteration < 60:  # Monitor for up to 2 minutes
    try:
        response = requests.get(url)
        if response.status_code == 200:
            state = response.json()
            current_step = state.get('current_step', 'unknown')
            status = state.get('status', 'unknown')
            progress = state.get('progress', 0)
            steps_completed = state.get('steps_completed', [])
            
            if current_step != previous_step:
                print(f"\n[{iteration}] Status: {status} | Progress: {progress}%")
                print(f"    Current Step: {current_step}")
                print(f"    Completed: {', '.join(steps_completed) if steps_completed else 'none'}")
                previous_step = current_step
            
            if status in ['completed', 'complete', 'failed']:
                print(f"\n✓ Run {status}!")
                print(f"\nFinal state:")
                print(json.dumps(state, indent=2))
                break
                
        elif response.status_code == 404:
            print(f"[{iteration}] Run not found yet (404) - waiting for worker to pick it up...")
        else:
            print(f"[{iteration}] Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"[{iteration}] Error: {e}")
    
    time.sleep(2)
    iteration += 1

print(f"\nMonitoring stopped after {iteration} iterations")
print(f"View full report at: http://localhost:8080/report/{run_id}")
