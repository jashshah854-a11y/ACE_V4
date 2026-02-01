# Codex One Hour Safety Verification

## Scope
- Prechecks, integration tests, synthetic load, chaos, and silence guarantees for SafetyGuard, ConsentProvider, CircuitBreaker, AuditLogger, PatternMonitor, ReflectionGenerator, AssertionEngine, ReconciliationEngine.
- Project standard runner: pytest.
- Only test code added.

## Environment and Assumptions
- Repo: C:\Users\jashs\Projects\ACE_V4
- Runner: Python 3.13.5, pytest 8.3.4
- Safety stack exercised via backend/core modules.
- No environment-specific secrets required for these tests.
- Invariant list artifact (15 safety rules) not found in repo; not validated against external spec.
- No checkpoint restart was triggered because context never fell below the 20 percent threshold.

## Results Summary
| Test Group | Status | Evidence |
| --- | --- | --- |
| Prechecks (consent default false, audit path writable, kill switch env, caps) | PASS | backend/tests/test_one_hour_safety_verification.py |
| A. Consent enforcement | FAIL | backend/tests/test_one_hour_safety_verification.py |
| B. No hardcoded consent / SafetyGuard routing | FAIL | backend/tests/test_one_hour_safety_verification.py, backend/api/server.py |
| C. Kill switches | FAIL | backend/tests/test_one_hour_safety_verification.py, backend/core/safety_guard.py |
| D. Circuit breaker caps + fail closed | FAIL | backend/tests/test_one_hour_safety_verification.py, backend/core/circuit_breaker.py |
| E. Audit logging completeness | FAIL | backend/tests/test_one_hour_safety_verification.py, backend/core/audit_logger.py |
| Synthetic load (200 users, 2000 ops, kill switch toggles, store failure sim) | PASS | backend/tests/test_one_hour_safety_verification.py |
| Chaos tests (audit logger fail, consent provider throws, breaker unavailable) | FAIL | backend/tests/test_one_hour_safety_verification.py |
| No silent overwrite; contradictions reduce confidence only | PASS | backend/tests/test_one_hour_safety_verification.py |
| Silence guarantee (no user-facing output in silent mode) | PASS | backend/tests/test_one_hour_safety_verification.py |

## Failures (Repro + Suspected Root Cause)
1. Allowed actions are not audit-logged with an explicit allowed=false/true flag.
   - Repro: `python -m pytest backend/tests/test_one_hour_safety_verification.py -k consent_enforcement_allows_with_consent`
   - Root cause: AuditLogger only logs blocked actions; schema has no `allowed` field. See `backend/core/audit_logger.py`.

2. Hardcoded consent and bypass of SafetyGuard in assertion path.
   - Repro: `python -m pytest backend/tests/test_one_hour_safety_verification.py -k no_hardcoded_consent_or_bypass_in_server`
   - Root cause: `user_consent=True` passed to AssertionEngine in `backend/api/server.py`. Also decision touch endpoint does not route through SafetyGuard (`check_decision_touch` missing).

3. Kill switch audit reason code not specific.
   - Repro: `python -m pytest backend/tests/test_one_hour_safety_verification.py -k kill_switch_blocks_memory_ops`
   - Root cause: Audit log reason_code is `kill_switch_active` while decision reason is `kill_switch_reflection_global_off`. See `backend/core/safety_guard.py`.

4. Reflection cap test blocked by cooldown gate.
   - Repro: `python -m pytest backend/tests/test_one_hour_safety_verification.py -k circuit_breaker_user_cap`
   - Root cause: Reflection cooldown gate triggers after first reflection; cap cannot be exercised without time control. See `backend/core/circuit_breaker.py` and `backend/core/safety_guard.py`.

5. Circuit breaker store failure does not fail closed.
   - Repro: `python -m pytest backend/tests/test_one_hour_safety_verification.py -k circuit_breaker_store_failure_fails_closed`
   - Root cause: SafetyGuard does not catch circuit breaker exceptions; errors propagate instead of returning a deny decision. See `backend/core/safety_guard.py`.

6. Audit logging completeness for blocked actions missing allowed=false flag.
   - Repro: `python -m pytest backend/tests/test_one_hour_safety_verification.py -k audit_logging_completeness`
   - Root cause: AuditEvent schema does not include allowed field; requirement not met. See `backend/core/audit_logger.py`.

7. Chaos: consent provider exception does not fail closed.
   - Repro: `python -m pytest backend/tests/test_one_hour_safety_verification.py -k chaos_consent_provider_failure`
   - Root cause: SafetyGuard does not catch consent provider exceptions. See `backend/core/safety_guard.py`.

8. Chaos: circuit breaker exception does not fail closed.
   - Repro: `python -m pytest backend/tests/test_one_hour_safety_verification.py -k chaos_circuit_breaker_failure`
   - Root cause: SafetyGuard does not catch circuit breaker exceptions. See `backend/core/safety_guard.py`.

## Follow-Up Tests for Phase 6.2 Long Horizon Harness
- Time-warp tests to validate per-user reflection caps independent of cooldown (mock time or injectable clock).
- End-to-end API tests for decision touch capture with SafetyGuard consent enforcement.
- Audit log schema validation (required fields, allowed flag, reason codes, redaction) under load and rotation.
- Circuit breaker persistent store failure simulation with fail-closed behavior and recovery.
- Full pipeline silent mode verification using HTTP layer to ensure no user-facing payloads emitted.

## Notes
- Per the critical leakage rule, no production code was changed after observing violations; only tests were added.
