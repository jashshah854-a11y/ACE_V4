import json
import os
import random
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from backend.api.decision_models import (
    ActionOutcome,
    DecisionTouch,
    MemoryAssertion,
    PatternCandidate,
    Reflection,
)
from backend.core.audit_logger import AuditLogger
from backend.core.circuit_breaker import (
    CircuitBreaker,
    CAP_CANDIDATES_PER_USER_30D,
    CAP_GLOBAL_REFLECTION_EMISSIONS_PER_DAY,
    CAP_REFLECTIONS_PER_USER_90D,
)
from backend.core.consent_provider import MockConsentProvider
from backend.core.safety_guard import SafetyGuard
from backend.jobs.assertion_engine import AssertionEngine
from backend.jobs.pattern_monitor import PatternMonitor
from backend.jobs.reconciliation_engine import ReconciliationEngine
from backend.jobs.reflection_generator import ReflectionGenerator


class DictConsentProvider:
    def __init__(self, default=False):
        self.default = default
        self.overrides = {}

    def grant(self, user_id: str):
        self.overrides[user_id] = True

    def revoke(self, user_id: str):
        self.overrides[user_id] = False

    def get_consent(self, user_id: str) -> bool:
        return self.overrides.get(user_id, self.default)


class FailingConsentProvider:
    def get_consent(self, user_id: str) -> bool:
        raise RuntimeError("consent provider unavailable")


class FailingCircuitBreaker:
    def check_candidate_cap(self, user_id: str):
        raise RuntimeError("counter store unavailable")

    def check_reflection_cap(self, user_id: str):
        raise RuntimeError("counter store unavailable")

    def check_reflection_cooldown(self, user_id: str):
        raise RuntimeError("counter store unavailable")

    def check_global_reflection_emission_cap(self):
        raise RuntimeError("counter store unavailable")

    def check_assertion_cap(self, user_id: str):
        raise RuntimeError("counter store unavailable")

    def check_global_assertion_creation_cap(self):
        raise RuntimeError("counter store unavailable")


class FlakyCircuitBreaker:
    def __init__(self):
        self.fail_mode = False
        self.delegate = CircuitBreaker()

    def check_candidate_cap(self, user_id: str):
        if self.fail_mode:
            return False, "circuit_breaker_unavailable"
        return self.delegate.check_candidate_cap(user_id)

    def check_reflection_cap(self, user_id: str):
        if self.fail_mode:
            return False, "circuit_breaker_unavailable"
        return self.delegate.check_reflection_cap(user_id)

    def check_reflection_cooldown(self, user_id: str):
        if self.fail_mode:
            return False, "circuit_breaker_unavailable"
        return self.delegate.check_reflection_cooldown(user_id)

    def check_global_reflection_emission_cap(self):
        if self.fail_mode:
            return False, "circuit_breaker_unavailable"
        return self.delegate.check_global_reflection_emission_cap()

    def record_reflection(self, user_id: str):
        self.delegate.record_reflection(user_id)

    def record_candidate(self, user_id: str):
        self.delegate.record_candidate(user_id)

    def record_global_reflection_emission(self):
        self.delegate.record_global_reflection_emission()


def make_guard(tmp_path, consent_provider=None, circuit_breaker=None):
    audit_log_dir = tmp_path / "audit_logs"
    audit_logger = AuditLogger(log_dir=audit_log_dir, mode="file")
    consent = consent_provider or DictConsentProvider(default=False)
    breaker = circuit_breaker or CircuitBreaker()
    guard = SafetyGuard(
        consent_provider=consent,
        circuit_breaker=breaker,
        audit_logger=audit_logger,
    )
    return guard, audit_log_dir, breaker, consent


def read_audit_events(log_dir: Path):
    events = []
    for log_file in log_dir.glob("safety_audit_*.jsonl"):
        with open(log_file, "r", encoding="utf-8") as handle:
            for line in handle:
                events.append(json.loads(line))
    return events


def make_pattern(user_id: str, days_old: float, occurrences: int = 3):
    last_seen = datetime.now(timezone.utc)
    first_seen = last_seen - timedelta(days=days_old)
    return PatternCandidate(
        user_id=user_id,
        interaction_sequence="trust_inspect",
        outcome_tag="positive",
        occurrence_count=occurrences,
        first_seen_at=first_seen,
        last_seen_at=last_seen,
    )


def make_touches(user_id: str, run_id: str, count: int):
    touches = []
    for idx in range(count):
        touches.append(
            DecisionTouch(
                run_id=run_id,
                user_id=user_id,
                session_id=f"session_{user_id}",
                touch_type="action_click",
                target_id=f"target_{idx}",
                context={},
            )
        )
    return touches


def make_outcomes(run_id: str, touches):
    outcomes = []
    for touch in touches:
        outcomes.append(
            ActionOutcome(
                decision_touch_id=touch.id,
                run_id=run_id,
                action_item_id="action_1",
                status="positive",
                notes=None,
            )
        )
    return outcomes


def test_precheck_defaults_and_paths(tmp_path, monkeypatch):
    monkeypatch.delenv("MOCK_CONSENT_VALUE", raising=False)
    provider = MockConsentProvider()
    assert provider.default_consent is False

    audit_logger = AuditLogger(log_dir=tmp_path / "audit_logs", mode="file")
    audit_logger.log_blocked_action(
        timestamp=datetime.now(timezone.utc),
        action_type="precheck",
        reason_code="test_write",
        user_id="user_precheck",
        request_id="req_precheck",
    )
    events = read_audit_events(tmp_path / "audit_logs")
    assert events

    monkeypatch.setenv("KILL_SWITCH_REFLECTION_GLOBAL_OFF", "true")
    monkeypatch.setenv("KILL_SWITCH_PATTERN_MONITOR_PAUSE", "true")
    guard = SafetyGuard(
        consent_provider=DictConsentProvider(default=False),
        circuit_breaker=CircuitBreaker(),
        audit_logger=audit_logger,
    )
    assert guard.kill_switch_reflection_off is True
    assert guard.kill_switch_pattern_pause is True
    assert CAP_REFLECTIONS_PER_USER_90D == 3
    assert CAP_GLOBAL_REFLECTION_EMISSIONS_PER_DAY == 2000
    assert CAP_CANDIDATES_PER_USER_30D == 50


def test_consent_enforcement_denies_without_consent(tmp_path):
    guard, log_dir, breaker, _ = make_guard(tmp_path)
    patterns = [make_pattern("user_a", days_old=10)]
    generator = ReflectionGenerator(
        patterns,
        [],
        safety_guard=guard,
        circuit_breaker=breaker,
    )
    result = generator.generate("run_1", "user_a")
    assert result is None
    assert len(breaker.user_reflections["user_a"]) == 0
    events = read_audit_events(log_dir)
    assert any(event["reason_code"] == "no_consent" for event in events)


def test_consent_enforcement_allows_with_consent(tmp_path):
    consent = DictConsentProvider(default=False)
    consent.grant("user_a")
    guard, log_dir, breaker, _ = make_guard(tmp_path, consent_provider=consent)
    patterns = [make_pattern("user_a", days_old=10)]
    generator = ReflectionGenerator(
        patterns,
        [],
        safety_guard=guard,
        circuit_breaker=breaker,
    )
    result = generator.generate("run_1", "user_a")
    assert result is not None
    events = read_audit_events(log_dir)
    assert any(event.get("allowed") is True for event in events)


def test_consent_enforcement_revocation_blocks_again(tmp_path):
    consent = DictConsentProvider(default=False)
    consent.grant("user_a")
    guard, log_dir, breaker, _ = make_guard(tmp_path, consent_provider=consent)
    patterns = [make_pattern("user_a", days_old=10)]
    generator = ReflectionGenerator(
        patterns,
        [],
        safety_guard=guard,
        circuit_breaker=breaker,
    )
    assert generator.generate("run_1", "user_a") is not None
    consent.revoke("user_a")
    result = generator.generate("run_2", "user_a")
    assert result is None
    events = read_audit_events(log_dir)
    assert any(event["reason_code"] == "no_consent" for event in events)


def test_no_hardcoded_consent_or_bypass_in_server():
    server_path = Path(__file__).resolve().parents[1] / "api" / "server.py"
    contents = server_path.read_text(encoding="utf-8")
    assert "user_consent=True" not in contents
    assert "check_decision_touch" in contents


def test_kill_switch_blocks_memory_ops(tmp_path, monkeypatch):
    monkeypatch.setenv("KILL_SWITCH_REFLECTION_GLOBAL_OFF", "true")
    monkeypatch.setenv("KILL_SWITCH_PATTERN_MONITOR_PAUSE", "true")
    consent = DictConsentProvider(default=True)
    guard, log_dir, breaker, _ = make_guard(tmp_path, consent_provider=consent)

    patterns = [make_pattern("user_a", days_old=10)]
    generator = ReflectionGenerator(patterns, [], safety_guard=guard, circuit_breaker=breaker)
    assert generator.generate("run_1", "user_a") is None

    touches = make_touches("user_a", "run_1", 3)
    outcomes = make_outcomes("run_1", touches)
    monitor = PatternMonitor(touches, outcomes, safety_guard=guard, circuit_breaker=breaker)
    candidates = monitor.run_analysis()
    assert candidates == []

    events = read_audit_events(log_dir)
    reason_codes = {event["reason_code"] for event in events}
    assert "kill_switch_reflection_global_off" in reason_codes
    assert "kill_switch_pattern_monitor_pause" in reason_codes


def test_kill_switch_off_allows_when_consent_true(tmp_path, monkeypatch):
    monkeypatch.setenv("KILL_SWITCH_REFLECTION_GLOBAL_OFF", "false")
    monkeypatch.setenv("KILL_SWITCH_PATTERN_MONITOR_PAUSE", "false")
    consent = DictConsentProvider(default=True)
    guard, _, breaker, _ = make_guard(tmp_path, consent_provider=consent)
    patterns = [make_pattern("user_a", days_old=10)]
    generator = ReflectionGenerator(patterns, [], safety_guard=guard, circuit_breaker=breaker)
    assert generator.generate("run_1", "user_a") is not None


def test_circuit_breaker_user_cap(tmp_path, monkeypatch):
    consent = DictConsentProvider(default=True)
    guard, _, breaker, _ = make_guard(tmp_path, consent_provider=consent)
    monkeypatch.setattr(breaker, "check_reflection_cooldown", lambda user_id: (True, "ok"))
    allowed = 0
    for idx in range(CAP_REFLECTIONS_PER_USER_90D + 1):
        decision = guard.check_reflection_generation("user_a", 10.0, request_id=f"req_{idx}")
        if decision.allow:
            breaker.record_reflection("user_a")
            allowed += 1
    assert allowed == CAP_REFLECTIONS_PER_USER_90D
    decision = guard.check_reflection_generation("user_a", 10.0, request_id="req_final")
    assert decision.allow is False
    assert decision.reason_code == "reflection_cap_exceeded"


def test_circuit_breaker_global_cap(tmp_path):
    consent = DictConsentProvider(default=True)
    guard, _, breaker, _ = make_guard(tmp_path, consent_provider=consent)
    for _ in range(CAP_GLOBAL_REFLECTION_EMISSIONS_PER_DAY):
        breaker.record_global_reflection_emission()
    decision = guard.check_reflection_emission("user_a", "ref_1", request_id="req_global")
    assert decision.allow is False
    assert decision.reason_code == "global_reflection_emission_cap_exceeded"


def test_circuit_breaker_store_failure_fails_closed(tmp_path):
    consent = DictConsentProvider(default=True)
    audit_logger = AuditLogger(log_dir=tmp_path / "audit_logs", mode="file")
    guard = SafetyGuard(
        consent_provider=consent,
        circuit_breaker=FailingCircuitBreaker(),
        audit_logger=audit_logger,
    )
    decision = guard.check_pattern_monitor("user_a", request_id="req_fail")
    assert decision.allow is False
    assert decision.reason_code == "circuit_breaker_unavailable"


def test_audit_logging_completeness(tmp_path):
    guard, log_dir, _, _ = make_guard(tmp_path)
    guard.check_pattern_monitor("user_a", request_id="req_audit")
    events = read_audit_events(log_dir)
    assert events
    event = events[0]
    assert "timestamp" in event
    assert "user_id" in event
    assert "action_type" in event
    assert "reason_code" in event
    assert "request_id" in event
    assert event.get("allowed") is False


def test_audit_logging_never_includes_sensitive_payload(tmp_path):
    guard, log_dir, _, _ = make_guard(tmp_path)
    guard.check_decision_touch("action_click", user_id="user_a", request_id="req_sensitive")
    events = read_audit_events(log_dir)
    assert events
    serialized = json.dumps(events)
    assert "reflection_text" not in serialized
    assert "assertion_text" not in serialized
    assert "notes" not in serialized


def test_contradictions_reduce_confidence_only():
    user_id = "user_a"
    assertions = [
        MemoryAssertion(
            user_id=user_id,
            assertion_text="Trust inspect has preceded positive outcomes in prior sessions.",
            confidence_level="medium",
            source_pattern_ids=["p1"],
            source_reflection_id="r1",
        ),
        MemoryAssertion(
            user_id=user_id,
            assertion_text="Trust inspect has preceded negative outcomes in prior sessions.",
            confidence_level="medium",
            source_pattern_ids=["p2"],
            source_reflection_id="r2",
        ),
    ]
    engine = AssertionEngine([], [], assertions, user_consent=True)
    engine.check_contradictions(user_id)
    assert len(engine.assertions) == 2
    assert all(a.confidence_level == "low" for a in engine.assertions)


def test_synthetic_load_safety_guards(tmp_path):
    rng = random.Random(42)
    users = [f"user_{idx}" for idx in range(200)]
    consented = set(rng.sample(users, int(len(users) * 0.2)))
    consent = DictConsentProvider(default=False)
    for user_id in consented:
        consent.grant(user_id)

    breaker = FlakyCircuitBreaker()
    audit_logger = AuditLogger(log_dir=tmp_path / "audit_logs", mode="file")
    guard = SafetyGuard(
        consent_provider=consent,
        circuit_breaker=breaker,
        audit_logger=audit_logger,
    )

    successes = defaultdict(int)
    successes_during_kill = 0
    reason_counts = defaultdict(int)

    consented_list = sorted(consented)

    for idx in range(2000):
        if idx in (200, 800, 1400):
            guard.kill_switch_reflection_off = True
        if idx in (350, 1100, 1700):
            guard.kill_switch_reflection_off = False
        breaker.fail_mode = idx % 250 == 0

        if breaker.fail_mode and consented_list:
            user_id = rng.choice(consented_list)
        else:
            user_id = rng.choice(users)
        decision = guard.check_reflection_generation(
            user_id=user_id,
            pattern_age_days=10.0,
            request_id=f"req_{idx}",
        )
        if decision.allow:
            breaker.record_reflection(user_id)
            successes[user_id] += 1
            if guard.kill_switch_reflection_off:
                successes_during_kill += 1
        else:
            reason_counts[decision.reason_code] += 1

    assert all(user_id in consented for user_id in successes.keys())
    assert successes_during_kill == 0
    assert reason_counts["no_consent"] > 0
    assert reason_counts["kill_switch_reflection_global_off"] > 0
    assert reason_counts["circuit_breaker_unavailable"] > 0


def test_chaos_audit_logger_failure(tmp_path):
    log_dir = tmp_path / "audit_logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / f"safety_audit_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.jsonl"
    log_file.write_text("", encoding="utf-8")
    os.chmod(log_file, 0o444)

    audit_logger = AuditLogger(log_dir=log_dir, mode="file")
    guard = SafetyGuard(
        consent_provider=DictConsentProvider(default=False),
        circuit_breaker=CircuitBreaker(),
        audit_logger=audit_logger,
    )
    decision = guard.check_pattern_monitor("user_a", request_id="req_audit_fail")
    assert decision.allow is False


def test_chaos_consent_provider_failure(tmp_path):
    audit_logger = AuditLogger(log_dir=tmp_path / "audit_logs", mode="file")
    guard = SafetyGuard(
        consent_provider=FailingConsentProvider(),
        circuit_breaker=CircuitBreaker(),
        audit_logger=audit_logger,
    )
    decision = guard.check_pattern_monitor("user_a", request_id="req_consent_fail")
    assert decision.allow is False
    assert decision.reason_code == "consent_provider_unavailable"


def test_chaos_circuit_breaker_failure(tmp_path):
    audit_logger = AuditLogger(log_dir=tmp_path / "audit_logs", mode="file")
    guard = SafetyGuard(
        consent_provider=DictConsentProvider(default=True),
        circuit_breaker=FailingCircuitBreaker(),
        audit_logger=audit_logger,
    )
    decision = guard.check_reflection_generation("user_a", 10.0, request_id="req_breaker_fail")
    assert decision.allow is False
    assert decision.reason_code == "circuit_breaker_unavailable"


def test_silence_mode_no_user_facing_output(tmp_path, monkeypatch):
    monkeypatch.setenv("KILL_SWITCH_REFLECTION_GLOBAL_OFF", "true")
    consent = DictConsentProvider(default=True)
    guard, _, breaker, _ = make_guard(tmp_path, consent_provider=consent)
    patterns = [make_pattern("user_a", days_old=10)]
    generator = ReflectionGenerator(patterns, [], safety_guard=guard, circuit_breaker=breaker)
    reflection = generator.generate("run_silent", "user_a")
    assert reflection is None