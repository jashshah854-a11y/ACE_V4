
import requests
import uuid
import time
import sys

API_BASE = "http://127.0.0.1:8001"
RUN_ID = "pattern-test-run"

def create_pattern_data():
    """Inject data to form a pattern: 'evidence_expand -> positive' (3 times)."""
    user_id = "user_pattern_checker"
    touch_type = "evidence_expand"
    outcome = "positive"
    
    print(f"Creating pattern for {user_id}: {touch_type} -> {outcome} (3x)")
    
    for i in range(3):
        # 1. Create decision touch
        try:
            resp = requests.post(f"{API_BASE}/api/decision-touch", json={
                "run_id": RUN_ID,
                "user_id": user_id,
                "session_id": "test-session",
                "touch_type": touch_type,
                "target_id": "test-target",
                "context": {"sim_index": i}
            })
            resp.raise_for_status()
        except Exception as e:
            print(f"Touch failed: {e}")
            continue
            
        data = resp.json()
        touch_id = data.get("id")
        
        if not touch_id:
            print(f"Server did not return ID! Response: {data}")
            continue

        # 2. Create outcome linked to touch
        try:
            resp = requests.post(f"{API_BASE}/api/action-outcome", json={
                "decision_touch_id": touch_id,
                "run_id": RUN_ID,
                "status": outcome
            })
            resp.raise_for_status()
            print(f"  Linked outcome {i+1}/3")
        except Exception as e:
            print(f"  Outcome failed: {e}")

def check_monitor():
    print("\nTriggering Pattern Monitor...")
    try:
        resp = requests.get(f"{API_BASE}/api/internal/pattern-monitor")
        result = resp.json()
        print("Monitor Result:", result)
        
        candidates = result.get("candidates_found", 0)
        ready = result.get("phase5_3_ready")
        
        if candidates >= 1:
            print("✅ SUCCESS: Pattern detected.")
        else:
            print("❌ FAILURE: No candidates found.")
            
        if ready is False:
             print("✅ SUCCESS: Gate locked (age < 7 days).")
        else:
             print("❌ FAILURE: Gate unlocked prematurely.")
             
    except Exception as e:
        print(f"Monitor failed: {e}")

if __name__ == "__main__":
    create_pattern_data()
    time.sleep(1)
    check_monitor()
