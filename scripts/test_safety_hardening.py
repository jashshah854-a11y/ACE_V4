"""
Phase 6.1 Safety Hardening - Test Suite

Validates:
1. Consent enforcement
2. Kill switch behavior
3. Circuit breaker caps
4. Audit logging
5. Safety invariants
"""

import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.getcwd())

from backend.safety.safety_guard import SafetyGuard, ConsentProvider, BlockReasonCode
from backend.safety.circuit_breaker import CircuitBreaker


def test_consent_enforcement():
    """Test that operations are blocked without consent."""
    print("=== Testing Consent Enforcement ===\n")
    
    consent_provider = ConsentProvider()
    guard = SafetyGuard(consent_provider)
    
    user_id = "test_user_no_consent"
    
    # Test 1: Decision capture without consent should be blocked
    print("[Test 1] Decision capture without consent...")
    decision = guard.check_decision_capture(user_id, "evidence_expand", "req_1")
    
    if not decision.allow and decision.reason_code == BlockReasonCode.NO_CONSENT:
        print("✅ PASS: Decision capture blocked without consent\n")
    else:
        print(f"❌ FAIL: Expected NO_CONSENT, got {decision.reason_code}\n")
        return False
    
    # Test 2: Grant consent
    print("[Test 2] Granting consent...")
    consent_provider.grant_consent(user_id)
    
    decision2 = guard.check_decision_capture(user_id, "evidence_expand", "req_2")
    if decision2.allow:
        print("✅ PASS: Decision capture allowed after consent granted\n")
    else:
        print(f"❌ FAIL: Should be allowed, got {decision2.reason_code}\n")
        return False
    
    # Test 3: Revoke consent
    print("[Test 3] Revoking consent...")
    consent_provider.revoke_consent(user_id)
    
    decision3 = guard.check_decision_capture(user_id, "evidence_expand", "req_3")
    if not decision3.allow and decision3.reason_code == BlockReasonCode.NO_CONSENT:
        print("✅ PASS: Decision capture blocked after consent revoked\n")
    else:
        print(f"❌ FAIL: Should be blocked, got {decision3.allow}\n")
        return False
    
    return True


def test_kill_switches():
    """Test kill switch enforcement."""
    print("=== Testing Kill Switches ===\n")
    
    consent_provider = ConsentProvider()
    guard = SafetyGuard(consent_provider)
    
    user_id = "test_user_kill_switch"
    consent_provider.grant_consent(user_id)
    
    # Test 1: Reflection emission with kill switch off
    print("[Test 1] Reflection emission - kill switch inactive...")
    guard.kill_switch_reflection_off = False
    decision = guard.check_reflection_emission(user_id, "reflection_1", "req_1")
    
    if decision.allow:
        print("✅ PASS: Reflection allowed when kill switch inactive\n")
    else:
        print(f"❌ FAIL: Should be allowed, got {decision.reason_code}\n")
        return False
    
    # Test 2: Activate kill switch
    print("[Test 2] Activating reflection kill switch...")
    guard.kill_switch_reflection_off = True
    
    decision2 = guard.check_reflection_emission(user_id, "reflection_2", "req_2")
    if not decision2.allow and decision2.reason_code == BlockReasonCode.KILL_SWITCH_ACTIVE:
        print("✅ PASS: Reflection blocked by kill switch\n")
    else:
        print(f"❌ FAIL: Expected KILL_SWITCH_ACTIVE, got {decision2.reason_code}\n")
        return False
    
    # Test 3: Pattern monitor kill switch
    print("[Test 3] Pattern monitor kill switch...")
    guard.kill_switch_pattern_monitor_pause = True
    
    decision3 = guard.check_pattern_monitor(user_id, "req_3")
    if not decision3.allow and decision3.reason_code == BlockReasonCode.KILL_SWITCH_ACTIVE:
        print("✅ PASS: Pattern monitor blocked by kill switch\n")
    else:
        print(f"❌ FAIL: Expected KILL_SWITCH_ACTIVE, got {decision3.reason_code}\n")
        return False
    
    return True


def test_circuit_breaker_caps():
    """Test circuit breaker caps."""
    print("=== Testing Circuit Breaker Caps ===\n")
    
    breaker = CircuitBreaker(reset_window_hours=24)
    user_id = "test_user_caps"
    
    # Test 1: Record reflections up to cap
    print(f"[Test 1] Recording reflections up to cap ({breaker.PER_USER_REFLECTION_CAP_PER_DAY})...")
    
    for i in range(breaker.PER_USER_REFLECTION_CAP_PER_DAY):
        breaker.record_user_reflection(user_id)
    
    if not breaker.check_user_reflection_cap(user_id):
        print("✅ PASS: User reflection cap enforced\n")
    else:
        print("❌ FAIL: Cap not enforced\n")
        return False
    
    # Test 2: Global reflection cap
    print(f"[Test 2] Global reflection cap ({breaker.GLOBAL_REFLECTION_CAP_PER_DAY})...")
    
    breaker2 = CircuitBreaker()
    for i in range(breaker2.GLOBAL_REFLECTION_CAP_PER_DAY):
        breaker2.record_global_reflection_emission()
    
    if not breaker2.check_global_reflection_cap():
        print("✅ PASS: Global reflection cap enforced\n")
    else:
        print("❌ FAIL: Global cap not enforced\n")
        return False
    
    # Test 3: Reset window
    print("[Test 3] Circuit breaker reset...")
    breaker3 = CircuitBreaker(reset_window_hours=0)  # Immediate reset
    breaker3.record_user_reflection(user_id)
    
    # Force check reset (time elapsed)
    breaker3.state.last_reset_at = datetime.utcnow() - timedelta(hours=1)
    breaker3._check_reset()
    
    if breaker3.check_user_reflection_cap(user_id):
        print("✅ PASS: Counters reset after window\n")
    else:
        print("❌ FAIL: Reset not working\n")
        return False
    
    return True


def test_audit_logging():
    """Test audit logging of blocked actions."""
    print("=== Testing Audit Logging ===\n")
    
    consent_provider = ConsentProvider()
    guard = SafetyGuard(consent_provider)
    
    user_id = "test_user_audit"
    
    # Block an action
    print("[Test 1] Blocking action and checking audit log...")
    guard.check_decision_capture(user_id, "evidence_expand", "req_audit")
    
    audit_log = guard.get_audit_log()
    
    if len(audit_log) > 0:
        last_entry = audit_log[-1]
        if (last_entry['action'] == 'decision_capture' and 
            last_entry['user_id'] == user_id and
            last_entry['reason'] == 'no_consent'):
            print("✅ PASS: Blocked action logged correctly")
            print(f"   Entry: {last_entry}\n")
        else:
            print(f"❌ FAIL: Incorrect log entry: {last_entry}\n")
            return False
    else:
        print("❌ FAIL: No audit log entries\n")
        return False
    
    # Test 2: Invalid touch type logging
    print("[Test 2] Invalid touch type blocked and logged...")
    consent_provider.grant_consent(user_id)
    guard.check_decision_capture(user_id, "invalid_type", "req_invalid")
    
    audit_log2 = guard.get_audit_log()
    invalid_entry = [e for e in audit_log2 if e.get('metadata', {}).get('touch_type') == 'invalid_type']
    
    if len(invalid_entry) > 0 and invalid_entry[0]['reason'] == 'invalid_input':
        print("✅ PASS: Invalid input logged\n")
    else:
        print("❌ FAIL: Invalid input not properly logged\n")
        return False
    
    return True


def test_safety_invariants():
    """Validate all safety invariants."""
    print("=== Testing Safety Invariants ===\n")
    
    consent_provider = ConsentProvider()
    guard = SafetyGuard(consent_provider)
    breaker = CircuitBreaker()
    
    invariants_passed = 0
    total_invariants = 4
    
    # Invariant 1: No tracking before consent
    print("[Invariant 1] No tracking before consent...")
    decision = guard.check_decision_capture("no_consent_user", "evidence_expand", "inv_1")
    if not decision.allow:
        print("✅ PASS\n")
        invariants_passed += 1
    else:
        print("❌ FAIL\n")
    
    # Invariant 2: Unknown touch types rejected
    print("[Invariant 2] Unknown touch types rejected...")
    consent_provider.grant_consent("test_user")
    decision2 = guard.check_decision_capture("test_user", "unknown_type", "inv_2")
    if not decision2.allow and decision2.reason_code == BlockReasonCode.INVALID_INPUT:
        print("✅ PASS\n")
        invariants_passed += 1
    else:
        print("❌ FAIL\n")
    
    # Invariant 3: Kill switches block operations
    print("[Invariant 3] Kill switches block operations...")
    guard.kill_switch_reflection_off = True
    decision3 = guard.check_reflection_emission("test_user", "ref_1", "inv_3")
    if not decision3.allow:
        print("✅ PASS\n")
        invariants_passed += 1
    else:
        print("❌ FAIL\n")
    
    # Invariant 4: Caps prevent runaway growth
    print("[Invariant 4] Caps prevent runaway growth...")
    for i in range(breaker.PER_USER_REFLECTION_CAP_PER_DAY + 1):
        breaker.record_user_reflection("capped_user")
    if not breaker.check_user_reflection_cap("capped_user"):
        print("✅ PASS\n")
        invariants_passed += 1
    else:
        print("❌ FAIL\n")
    
    print(f"Invariants Passed: {invariants_passed}/{total_invariants}\n")
    return invariants_passed == total_invariants


def main():
    print("="*60)
    print("PHASE 6.1 SAFETY HARDENING - TEST SUITE")
    print("="*60 + "\n")
    
    results = []
    
    results.append(("Consent Enforcement", test_consent_enforcement()))
    results.append(("Kill Switches", test_kill_switches()))
    results.append(("Circuit Breaker Caps", test_circuit_breaker_caps()))
    results.append(("Audit Logging", test_audit_logging()))
    results.append(("Safety Invariants", test_safety_invariants()))
    
    print("="*60)
    print("TEST RESULTS")
    print("="*60)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    all_passed = all(r[1] for r in results)
    
    if all_passed:
        print("\n✅ ALL TESTS PASSED")
    else:
        print("\n❌ SOME TESTS FAILED")
    
    return all_passed


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
