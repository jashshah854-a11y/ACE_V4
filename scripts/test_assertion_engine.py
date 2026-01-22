"""
Test script for Memory Assertion Engine.

Validates:
1. 30-day gate enforcement
2. Assertion creation from mature patterns
3. Contradiction detection and confidence reduction
4. 60-day decay logic
5. Memory state calculation
"""

import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.getcwd())

from backend.api.decision_models import (
    PatternCandidate,
    Reflection,
    MemoryAssertion,
    UserMemoryState
)
from backend.jobs.assertion_engine import AssertionEngine


def test_assertion_engine():
    print("=== Testing Memory Assertion Engine ===\n")
    
    user_id = "test_user_assertions"
    
    # Test 1: Young pattern (< 30 days) should NOT create assertion
    print("[Test 1] Young pattern gate check...")
    young_pattern = PatternCandidate(
        user_id=user_id,
        interaction_sequence="action_click -> positive",
        outcome_tag="positive",
        occurrence_count=5,
        first_seen_at=datetime.utcnow() - timedelta(days=20),
        last_seen_at=datetime.utcnow()
    )
    
    young_reflection = Reflection(
        run_id="test_run",
        pattern_candidate_id=young_pattern.id,
        reflection_text="Previously, action click was followed by a positive outcome.",
        display_location='reflection_slot',
        dismissed=False
    )
    
    engine = AssertionEngine([young_pattern], [young_reflection], [], user_consent=True)
    new_assertions = engine.evaluate_patterns(user_id)
    
    if len(new_assertions) == 0:
        print("✅ PASS: Young pattern correctly rejected (< 30 days)\n")
    else:
        print(f"❌ FAIL: Young pattern created assertion: {new_assertions}\n")
        return
    
    # Test 2: Mature pattern (30+ days) should create assertion
    print("[Test 2] Mature pattern assertion creation...")
    mature_pattern = PatternCandidate(
        user_id=user_id,
        interaction_sequence="evidence_expand -> positive",
        outcome_tag="positive",
        occurrence_count=5,
        first_seen_at=datetime.utcnow() - timedelta(days=35),
        last_seen_at=datetime.utcnow()
    )
    
    mature_reflection = Reflection(
        run_id="test_run",
        pattern_candidate_id=mature_pattern.id,
        reflection_text="Previously, evidence expand was followed by a positive outcome.",
        display_location='reflection_slot',
        dismissed=False
    )
    
    engine = AssertionEngine([mature_pattern], [mature_reflection], [], user_consent=True)
    new_assertions = engine.evaluate_patterns(user_id)
    
    if len(new_assertions) == 1:
        assertion = new_assertions[0]
        print(f"✅ PASS: Assertion created")
        print(f"   Text: {assertion.assertion_text}")
        print(f"   Confidence: {assertion.confidence_level}\n")
    else:
        print(f"❌ FAIL: Expected 1 assertion, got {len(new_assertions)}\n")
        return
    
    # Test 3: Dismissed reflection should NOT create assertion
    print("[Test 3] Dismissed reflection gate check...")
    dismissed_reflection = Reflection(
        run_id="test_run",
        pattern_candidate_id=mature_pattern.id,
        reflection_text="Previously, evidence expand was followed by a positive outcome.",
        display_location='reflection_slot',
        dismissed=True  # DISMISSED
    )
    
    engine = AssertionEngine([mature_pattern], [dismissed_reflection], [], user_consent=True)
    new_assertions = engine.evaluate_patterns(user_id)
    
    if len(new_assertions) == 0:
        print("✅ PASS: Dismissed reflection correctly blocked\n")
    else:
        print(f"❌ FAIL: Dismissed reflection created assertion\n")
        return
    
    # Test 4: Contradiction detection
    print("[Test 4] Contradiction detection and confidence reduction...")
    
    # Create two patterns with same interaction, different outcomes
    pattern_a = PatternCandidate(
        user_id=user_id,
        interaction_sequence="risk_taking",  # Same interaction
        outcome_tag="positive",  # Different outcome
        occurrence_count=5,
        first_seen_at=datetime.utcnow() - timedelta(days=40),
        last_seen_at=datetime.utcnow()
    )
    
    pattern_b = PatternCandidate(
        user_id=user_id,
        interaction_sequence="risk_taking",  # Same interaction
        outcome_tag="negative",  # Different outcome
        occurrence_count=5,
        first_seen_at=datetime.utcnow() - timedelta(days=35),
        last_seen_at=datetime.utcnow()
    )
    
    reflection_a = Reflection(
        run_id="test_run",
        pattern_candidate_id=pattern_a.id,
        reflection_text="Prev text",
        display_location='reflection_slot',
        dismissed=False
    )
    
    reflection_b = Reflection(
        run_id="test_run",
        pattern_candidate_id=pattern_b.id,
        reflection_text="Prev text 2",
        display_location='reflection_slot',
        dismissed=False
    )
    
    engine = AssertionEngine([pattern_a, pattern_b], [reflection_a, reflection_b], [], user_consent=True)
    assertions = engine.evaluate_patterns(user_id)
    
    # Add new assertions to engine's internal list (simulating what the endpoint does)
    engine.assertions.extend(assertions)
    
    # Now check contradictions
    engine.check_contradictions(user_id)
    
    # Both should be downgraded to 'low'
    all_low = all(a.confidence_level == 'low' for a in engine.assertions)
    
    if all_low and len(engine.assertions) == 2:
        print("✅ PASS: Contradictions detected, confidence lowered to 'low'\n")
    else:
        print(f"❌ FAIL: Contradiction handling incorrect")
        for a in engine.assertions:
            print(f"   {a.assertion_text}: {a.confidence_level}")
        print()
        return
    
    # Test 5: Memory state calculation
    print("[Test 5] Memory state calculation...")
    state = engine.get_memory_state(user_id)
    
    if state.memory_state == 'unstable' and state.assertion_count == 2:
        print(f"✅ PASS: State = {state.memory_state}, Assertions = {state.assertion_count}\n")
    else:
        print(f"❌ FAIL: Expected unstable/2, got {state.memory_state}/{state.assertion_count}\n")
        return
    
    # Test 6: 60-day decay
    print("[Test 6] 60-day decay logic...")
    
    # Create old assertion
    old_assertion = MemoryAssertion(
        user_id=user_id,
        assertion_text="Old belief has preceded neutral outcomes in prior sessions.",
        confidence_level='low',
        source_pattern_ids=["old_pattern"],
        source_reflection_id="old_reflection",
        created_at=datetime.utcnow() - timedelta(days=70),
        last_reinforced_at=datetime.utcnow() - timedelta(days=70)
    )
    
    engine_decay = AssertionEngine([], [], [old_assertion], user_consent=True)
    deleted_ids = engine_decay.apply_decay(user_id)
    
    if len(deleted_ids) == 1:
        print(f"✅ PASS: Old assertion ({old_assertion.days_since_reinforcement:.1f} days) deleted\n")
    else:
        print(f"❌ FAIL: Decay logic failed, deleted {len(deleted_ids)} assertions\n")
        return
    
    print("=== All Tests Passed ===")


if __name__ == "__main__":
    test_assertion_engine()
