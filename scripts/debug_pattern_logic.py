
import sys
import os
from datetime import datetime, timedelta
import uuid

# Add backend path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
sys.path.append(os.getcwd())

from backend.api.decision_models import DecisionTouch, ActionOutcome, PatternCandidate
from backend.jobs.pattern_monitor import PatternMonitor

def test_logic():
    print("Testing PatternMonitor logic...")
    
    user_id = "test_user"
    run_id = "test_run"
    
    # Create 3 Touches
    touches = []
    outcomes = []
    
    for i in range(3):
        t_id = str(uuid.uuid4())
        dt = datetime.utcnow() + timedelta(minutes=i)
        
        touch = DecisionTouch(
            id=t_id,
            run_id=run_id,
            user_id=user_id,
            session_id="sess",
            touch_type="evidence_expand",
            target_id="target",
            timestamp=dt
        )
        touches.append(touch)
        
        outcome = ActionOutcome(
            decision_touch_id=t_id,
            run_id=run_id,
            status="positive",
            marked_at=dt + timedelta(seconds=10)
        )
        outcomes.append(outcome)
        
    print(f"Created {len(touches)} touches and {len(outcomes)} outcomes.")
    
    monitor = PatternMonitor(touches, outcomes)
    candidates = monitor.run_analysis()
    
    print(f"Candidates found: {len(candidates)}")
    for c in candidates:
        print(f"Candidate: {c.interaction_sequence} -> {c.outcome_tag} (Count: {c.occurrence_count})")
        
    if len(candidates) == 1:
        print("✅ Logic PASS")
    else:
        print("❌ Logic FAIL")

if __name__ == "__main__":
    test_logic()
