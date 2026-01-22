
import requests
import uuid
import time
from datetime import datetime, timedelta

API_BASE = "http://localhost:8001"
RUN_ID = "reflection-test-run"
USER_ID = "user_reflection_target"

def create_historic_pattern():
    """
    We need a pattern that is >7 days old.
    The PatternMonitor uses `first_seen_at` from the decision touch timestamp.
    The `server.py` uses `datetime.utcnow()` for new touches.
    We CANNOT backdate via API standard endpoint.
    
    HACK: We will inject data directly via a helper or 
    we must modify `PatternCandidate.age_days` logic to be mockable?
    
    Or, since we are verifying `ReflectionGenerator` logic mostly:
    - `ReflectionGenerator` receives `PatternCandidate` objects.
    - We can unit test `ReflectionGenerator` completely offline (like previous debug script).
    - AND we can test the ENDPOINT by mocking the `PatternMonitor` output inside the server? 
      No, unsafe.
      
    BETTER HACK: 
    We will create a script `scripts/verify_reflection_pipeline.py` that:
    1. Imports `ReflectionGenerator`
    2. Creates mock `PatternCandidate` objects (one old, one new)
    3. Runs generator
    4. Prints result
    
    This validates the LOGIC. 
    To validate the ENDPOINT, we need to be able to create old data.
    Since `server.py` is in-memory for Phase 5, maybe we add a debug endpoint to inject raw objects with timestamps?
    
    Let's stick to the Offline Verification Script for logic (robust, fast).
    And use the API verification for "Connectivity" (returns "none" for fresh patterns).
    """
    pass

def verify_logic_offline():
    import sys
    import os
    sys.path.append(os.getcwd())
    
    from backend.api.decision_models import PatternCandidate, Reflection
    from backend.jobs.reflection_generator import ReflectionGenerator
    
    print("--- Verifying Reflection Generator Logic ---")
    
    patterns = []
    
    # 1. Mature Pattern (Eligible)
    p1 = PatternCandidate(
        user_id=USER_ID,
        interaction_sequence="trust_inspect -> no_action",
        outcome_tag="neutral",
        occurrence_count=3,
        first_seen_at=datetime.utcnow() - timedelta(days=10),
        last_seen_at=datetime.utcnow()
    )
    patterns.append(p1)
    
    # 2. Fresh Pattern (Ineligible)
    p2 = PatternCandidate(
        user_id="other_user",
        interaction_sequence="action_click -> positive",
        outcome_tag="positive",
        occurrence_count=3,
        first_seen_at=datetime.utcnow() - timedelta(days=2),
        last_seen_at=datetime.utcnow()
    )
    patterns.append(p2)
    
    existing_reflections = []
    
    generator = ReflectionGenerator(patterns, existing_reflections, user_consent=True)
    
    # Test 1: Should match P1 for USER_ID
    result = generator.generate(RUN_ID, USER_ID)
    
    if result and result.pattern_candidate_id == p1.id:
        print("✅ Eligible pattern generated reflection.")
        print(f"   Text: {result.reflection_text}")
    else:
        print(f"❌ Failed to generate from eligible pattern. Result: {result}")
        
    # Test 2: Tone Validator Check (Manual Mock)
    print("\n--- Testing Tone Validator ---")
    from backend.jobs.reflection_generator import ToneValidator
    
    bad_sentences = [
        "You should inspect the evidence more.",
        "That led to a bad outcome.",
        "It might be better to click.",
        "Startups usually fail."
    ]
    
    good_sentences = [
        "Previously, trust_inspect was followed by a neutral outcome.",
        "Action was followed by positive outcome."
    ]
    
    for s in bad_sentences:
        if not ToneValidator.validate(s):
             print(f"✅ Correctly rejected: '{s}'")
        else:
             print(f"❌ FAILED to reject: '{s}'")
             
    for s in good_sentences:
        if ToneValidator.validate(s):
            print(f"✅ Correctly allowed: '{s}'")
        else:
            print(f"❌ FAILED to allow: '{s}'")

if __name__ == "__main__":
    verify_logic_offline()
