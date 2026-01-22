"""
Test suite for Phase 6 Memory Reconciliation Engine.

Validates:
1. Contradiction detection and resolution
2. Confidence reduction (not deletion)
3. Decay rule application
4. Coherence state calculation
5. Reconciliation note creation
"""

import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.getcwd())

from backend.api.decision_models import (
    MemoryAssertion,
    ReconciliationNote,
    BeliefCoherenceState
)
from backend.jobs.reconciliation_engine import ReconciliationEngine


def test_reconciliation_engine():
    print("=== Testing Memory Reconciliation Engine ===\n")
    
    user_id = "test_reconciliation_user"
    
    # Test 1: Contradiction Detection and Resolution
    print("[Test 1] Contradiction detection and confidence reduction...")
    
    # Create two conflicting assertions
    assertion_a = MemoryAssertion(
        user_id=user_id,
        assertion_text="Risk taking has preceded positive outcomes in prior sessions.",
        confidence_level='medium',
        source_pattern_ids=["pattern_a"],
        source_reflection_id="reflection_a"
    )
    
    assertion_b = MemoryAssertion(
        user_id=user_id,
        assertion_text="Risk taking has preceded negative outcomes in prior sessions.",
        confidence_level='medium',
        source_pattern_ids=["pattern_b"],
       source_reflection_id="reflection_b"
    )
    
    engine = ReconciliationEngine([assertion_a, assertion_b], [], None)
    state = engine.evaluate_coherence(user_id)
    
    # Check that both were reduced to 'low'
    if assertion_a.confidence_level == 'low' and assertion_b.confidence_level == 'low':
        print("✅ PASS: Both conflicting assertions reduced to 'low' confidence")
    else:
        print(f"❌ FAIL: Assertions not properly reduced: {assertion_a.confidence_level}, {assertion_b.confidence_level}")
        return
    
    # Check state is 'unstable'
    if state.current_state == 'unstable':
        print("✅ PASS: Coherence state = 'unstable'")
    else:
        print(f"❌ FAIL: Expected 'unstable', got '{state.current_state}'")
        return
    
    # Check reconciliation note was created
    notes = engine.get_reconciliation_notes()
    if len(notes) == 1 and notes[0].reconciliation_type == 'contradiction':
        print("✅ PASS: Reconciliation note created")
        print(f"   Reasoning: {notes[0].reasoning}\n")
    else:
        print(f"❌ FAIL: Expected 1 contradiction note, got {len(notes)}")
        return
    
    # Test 2: Decay Application
    print("[Test 2] Decay rule enforcement...")
    
    # Create aging assertion
    old_assertion = MemoryAssertion(
        user_id=user_id,
        assertion_text="Old pattern has preceded neutral outcomes in prior sessions.",
        confidence_level='medium',
        source_pattern_ids=["old_pattern"],
        source_reflection_id="old_reflection",
        created_at=datetime.utcnow() - timedelta(days=70),
        last_reinforced_at=datetime.utcnow() - timedelta(days=70)
    )
    
    engine2 = ReconciliationEngine([old_assertion], [], None)
    state2 = engine2.evaluate_coherence(user_id)
    
    if old_assertion.confidence_level == 'low':
        print("✅ PASS: Old assertion decayed from 'medium' to 'low'")
    else:
        print(f"❌ FAIL: Decay not applied, confidence still '{old_assertion.confidence_level}'")
        return
    
    decay_notes = engine2.get_reconciliation_notes()
    if len(decay_notes) == 1 and decay_notes[0].reconciliation_type == 'decay':
        print("✅ PASS: Decay note created")
        print(f"   Reasoning: {decay_notes[0].reasoning}\n")
    else:
        print(f"❌ FAIL: Expected 1 decay note, got {len(decay_notes)}")
        return
    
    # Test 3: Insufficient Data State
    print("[Test 3] Insufficient data state...")
    
    single_assertion = MemoryAssertion(
        user_id=user_id,
        assertion_text="Single pattern has preceded positive outcomes in prior sessions.",
        confidence_level='medium',
        source_pattern_ids=["single"],
        source_reflection_id="single_ref"
    )
    
    engine3 = ReconciliationEngine([single_assertion], [], None)
    state3 = engine3.evaluate_coherence(user_id)
    
    if state3.current_state == 'insufficient_data':
        print("✅ PASS: State = 'insufficient_data' for single assertion\n")
    else:
        print(f"❌ FAIL: Expected 'insufficient_data', got '{state3.current_state}'\n")
        return
    
    # Test 4: Stable State
    print("[Test 4] Stable coherence state...")
    
    # Create non-conflicting assertions
    assertion_1 = MemoryAssertion(
        user_id=user_id,
        assertion_text="Evidence expansion has preceded positive outcomes in prior sessions.",
        confidence_level='medium',
        source_pattern_ids=["evidence_pos"],
        source_reflection_id="ref1"
    )
    
    assertion_2 = MemoryAssertion(
        user_id=user_id,
        assertion_text="Action clicking has preceded neutral outcomes in prior sessions.",
        confidence_level='medium',
        source_pattern_ids=["action_neutral"],
        source_reflection_id="ref2"
    )
    
    engine4 = ReconciliationEngine([assertion_1, assertion_2], [], None)
    state4 = engine4.evaluate_coherence(user_id)
    
    if state4.current_state == 'stable':
        print("✅ PASS: State = 'stable' for non-conflicting assertions")
        print(f"   Assertion count: {state4.assertion_count}")
        print(f"   Contradiction count: {state4.contradiction_count}\n")
    else:
        print(f"❌ FAIL: Expected 'stable', got '{state4.current_state}'\n")
        return
    
    # Test 5: Decaying State
    print("[Test 5] Decaying coherence state...")
    
    # Create multiple old assertions
    old_assertions = []
    for i in range(4):
        old_a = MemoryAssertion(
            user_id=user_id,
            assertion_text=f"Pattern {i} has preceded positive outcomes in prior sessions.",
            confidence_level='medium',
            source_pattern_ids=[f"pattern_{i}"],
            source_reflection_id=f"ref_{i}",
            created_at=datetime.utcnow() - timedelta(days=65),
            last_reinforced_at=datetime.utcnow() - timedelta(days=65)
        )
        old_assertions.append(old_a)
    
    engine5 = ReconciliationEngine(old_assertions, [], None)
    state5 = engine5.evaluate_coherence(user_id)
    
    if state5.current_state == 'decaying':
        print("✅ PASS: State = 'decaying' when >50% of assertions are aging")
        print(f"   Assertion count: {state5.assertion_count}\n")
    else:
        print(f"❌ FAIL: Expected 'decaying', got '{state5.current_state}'\n")
        return
    
    print("=== All Tests Passed ===")


if __name__ == "__main__":
    test_reconciliation_engine()
