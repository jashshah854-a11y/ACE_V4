"""
Unit tests for SafetyGuard module.

Tests all decision gates: kill switches, consent, whitelist, temporal gates, and caps.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock
from backend.core.safety_guard import SafetyGuard, ALLOWED_TOUCH_TYPES


@pytest.fixture
def mock_consent_provider():
    """Mock consent provider for testing."""
    provider = Mock()
    provider.get_consent = Mock(return_value=True)
    return provider


@pytest.fixture
def mock_circuit_breaker():
    """Mock circuit breaker for testing."""
    breaker = Mock()
    breaker.check_reflection_cap = Mock(return_value=(True, "ok"))
    breaker.check_assertion_cap = Mock(return_value=(True, "ok"))
    breaker.check_candidate_cap = Mock(return_value=(True, "ok"))
    breaker.check_reflection_cooldown = Mock(return_value=(True, "ok"))
    breaker.check_global_reflection_emission_cap = Mock(return_value=(True, "ok"))
    breaker.check_global_assertion_creation_cap = Mock(return_value=(True, "ok"))
    return breaker


@pytest.fixture
def mock_audit_logger():
    """Mock audit logger for testing."""
    logger = Mock()
    logger.log_blocked_action = Mock()
    return logger


@pytest.fixture
def safety_guard(mock_consent_provider, mock_circuit_breaker, mock_audit_logger, monkeypatch):
    """Create SafetyGuard instance with mocks."""
    # Mock environment variables to False for testing
    monkeypatch.setenv("KILL_SWITCH_REFLECTION_GLOBAL_OFF", "false")
    monkeypatch.setenv("KILL_SWITCH_PATTERN_MONITOR_PAUSE", "false")
    
    guard = SafetyGuard(
        consent_provider=mock_consent_provider,
        circuit_breaker=mock_circuit_breaker,
        audit_logger=mock_audit_logger
    )
    return guard


class TestDecisionTouchGates:
    """Test decision touch validation gates."""
    
    def test_allowed_touch_type_passes(self, safety_guard):
        """Test that whitelisted touch types pass."""
        for touch_type in ALLOWED_TOUCH_TYPES:
            decision = safety_guard.check_decision_touch(
                touch_type=touch_type,
                user_id="user_123"
            )
            assert decision.allow is True
            assert decision.reason_code == "ok"
    
    def test_unknown_touch_type_rejected(self, safety_guard, mock_audit_logger):
        """Test that unknown touch types are rejected."""
        decision = safety_guard.check_decision_touch(
            touch_type="invalid_type",
            user_id="user_123"
        )
        assert decision.allow is False
        assert decision.reason_code == "touch_type_not_whitelisted"
        
        # Verify audit log was called
        mock_audit_logger.log_blocked_action.assert_called_once()
    
    def test_no_consent_blocks_touch(self, safety_guard, mock_consent_provider, mock_audit_logger):
        """Test that no consent blocks decision touch."""
        mock_consent_provider.get_consent.return_value = False
        
        decision = safety_guard.check_decision_touch(
            touch_type="action_click",
            user_id="user_123"
        )
        assert decision.allow is False
        assert decision.reason_code == "no_consent"
        
        # Verify audit log
        mock_audit_logger.log_blocked_action.assert_called_once()


class TestPatternMonitorGates:
    """Test pattern monitor gates."""
    
    def test_kill_switch_blocks_monitor(self, safety_guard, monkeypatch, mock_audit_logger):
        """Test that PATTERN_MONITOR_PAUSE kill switch blocks monitoring."""
        safety_guard.kill_switch_pattern_pause = True
        
        decision = safety_guard.check_pattern_monitor(user_id="user_123")
        assert decision.allow is False
        assert decision.reason_code == "kill_switch_pattern_monitor_pause"
        
        mock_audit_logger.log_blocked_action.assert_called_once()
    
    def test_no_consent_blocks_monitor(self, safety_guard, mock_consent_provider, mock_audit_logger):
        """Test that no consent blocks pattern monitoring."""
        mock_consent_provider.get_consent.return_value = False
        
        decision = safety_guard.check_pattern_monitor(user_id="user_123")
        assert decision.allow is False
        assert decision.reason_code == "no_consent"
    
    def test_candidate_cap_exceeded_blocks(self, safety_guard, mock_circuit_breaker, mock_audit_logger):
        """Test that hitting candidate cap blocks monitoring."""
        mock_circuit_breaker.check_candidate_cap.return_value = (False, "candidate_cap_exceeded")
        
        decision = safety_guard.check_pattern_monitor(user_id="user_123")
        assert decision.allow is False
        assert decision.reason_code == "candidate_cap_exceeded"


class TestReflectionGenerationGates:
    """Test reflection generation gates."""
    
    def test_kill_switch_blocks_generation(self, safety_guard, mock_audit_logger):
        """Test that REFLECTION_GLOBAL_OFF blocks generation."""
        safety_guard.kill_switch_reflection_off = True
        
        decision = safety_guard.check_reflection_generation(
            user_id="user_123",
            pattern_age_days=10.0
        )
        assert decision.allow is False
        assert decision.reason_code == "kill_switch_reflection_global_off"
    
    def test_no_consent_blocks_generation(self, safety_guard, mock_consent_provider):
        """Test that no consent blocks reflection generation."""
        mock_consent_provider.get_consent.return_value = False
        
        decision = safety_guard.check_reflection_generation(
            user_id="user_123",
            pattern_age_days=10.0
        )
        assert decision.allow is False
        assert decision.reason_code == "no_consent"
    
    def test_pattern_too_young_blocks(self, safety_guard):
        """Test that patterns < 7 days are rejected."""
        decision = safety_guard.check_reflection_generation(
            user_id="user_123",
            pattern_age_days=5.0  # Less than 7
        )
        assert decision.allow is False
        assert decision.reason_code == "pattern_too_young"
    
    def test_pattern_exactly_7_days_passes(self, safety_guard):
        """Test that patterns >= 7 days pass temporal gate."""
        decision = safety_guard.check_reflection_generation(
            user_id="user_123",
            pattern_age_days=7.0
        )
        assert decision.allow is True
        assert decision.reason_code == "ok"
    
    def test_reflection_cap_exceeded_blocks(self, safety_guard, mock_circuit_breaker):
        """Test that hitting reflection cap blocks generation."""
        mock_circuit_breaker.check_reflection_cap.return_value = (False, "reflection_cap_exceeded")
        
        decision = safety_guard.check_reflection_generation(
            user_id="user_123",
            pattern_age_days=10.0
        )
        assert decision.allow is False
        assert decision.reason_code == "reflection_cap_exceeded"
    
    def test_cooldown_blocks_generation(self, safety_guard, mock_circuit_breaker):
        """Test that reflection cooldown blocks generation."""
        mock_circuit_breaker.check_reflection_cooldown.return_value = (False, "reflection_cooldown_active")
        
        decision = safety_guard.check_reflection_generation(
            user_id="user_123",
            pattern_age_days=10.0
        )
        assert decision.allow is False
        assert decision.reason_code == "reflection_cooldown_active"


class TestReflectionEmissionGates:
    """Test reflection emission gates."""
    
    def test_kill_switch_blocks_emission(self, safety_guard):
        """Test that kill switch blocks emission."""
        safety_guard.kill_switch_reflection_off = True
        
        decision = safety_guard.check_reflection_emission(
            user_id="user_123",
            reflection_id="ref_123"
        )
        assert decision.allow is False
        assert decision.reason_code == "kill_switch_reflection_global_off"
    
    def test_no_consent_blocks_emission(self, safety_guard, mock_consent_provider):
        """Test that no consent blocks emission."""
        mock_consent_provider.get_consent.return_value = False
        
        decision = safety_guard.check_reflection_emission(
            user_id="user_123",
            reflection_id="ref_123"
        )
        assert decision.allow is False
        assert decision.reason_code == "no_consent"
    
    def test_global_emission_cap_blocks(self, safety_guard, mock_circuit_breaker):
        """Test that global emission cap blocks emission."""
        mock_circuit_breaker.check_global_reflection_emission_cap.return_value = (
            False, "global_reflection_emission_cap_exceeded"
        )
        
        decision = safety_guard.check_reflection_emission(
            user_id="user_123",
            reflection_id="ref_123"
        )
        assert decision.allow is False
        assert decision.reason_code == "global_reflection_emission_cap_exceeded"


class TestAssertionCreationGates:
    """Test assertion creation gates."""
    
    def test_no_consent_blocks_assertion(self, safety_guard, mock_consent_provider):
        """Test that no consent blocks assertion creation."""
        mock_consent_provider.get_consent.return_value = False
        
        decision = safety_guard.check_assertion_creation(
            user_id="user_123",
            pattern_age_days=35.0
        )
        assert decision.allow is False
        assert decision.reason_code == "no_consent"
    
    def test_pattern_too_young_blocks_assertion(self, safety_guard):
        """Test that patterns < 30 days are rejected for assertions."""
        decision = safety_guard.check_assertion_creation(
            user_id="user_123",
            pattern_age_days=25.0  # Less than 30
        )
        assert decision.allow is False
        assert decision.reason_code == "pattern_too_young"
    
    def test_pattern_exactly_30_days_passes(self, safety_guard):
        """Test that patterns >= 30 days pass temporal gate."""
        decision = safety_guard.check_assertion_creation(
            user_id="user_123",
            pattern_age_days=30.0
        )
        assert decision.allow is True
        assert decision.reason_code == "ok"
    
    def test_assertion_cap_exceeded_blocks(self, safety_guard, mock_circuit_breaker):
        """Test that hitting assertion cap blocks creation."""
        mock_circuit_breaker.check_assertion_cap.return_value = (False, "assertion_cap_exceeded")
        
        decision = safety_guard.check_assertion_creation(
            user_id="user_123",
            pattern_age_days=35.0
        )
        assert decision.allow is False
        assert decision.reason_code == "assertion_cap_exceeded"
    
    def test_global_assertion_cap_blocks(self, safety_guard, mock_circuit_breaker):
        """Test that global daily assertion cap blocks creation."""
        mock_circuit_breaker.check_global_assertion_creation_cap.return_value = (
            False, "global_assertion_creation_cap_exceeded"
        )
        
        decision = safety_guard.check_assertion_creation(
            user_id="user_123",
            pattern_age_days=35.0
        )
        assert decision.allow is False
        assert decision.reason_code == "global_assertion_creation_cap_exceeded"


class TestAuditLogging:
    """Test that audit logging occurs for blocked actions."""
    
    def test_blocked_actions_logged(self, safety_guard, mock_audit_logger, mock_consent_provider):
        """Test that all blocked actions trigger audit logs."""
        mock_consent_provider.get_consent.return_value = False
        
        # Test multiple block scenarios
        safety_guard.check_decision_touch("action_click", user_id="user_123")
        safety_guard.check_pattern_monitor(user_id="user_123")
        safety_guard.check_reflection_generation(user_id="user_123", pattern_age_days=10.0)
        
        # Verify audit logger was called for each
        assert mock_audit_logger.log_blocked_action.call_count == 3
    
    def test_successful_actions_not_logged(self, safety_guard, mock_audit_logger):
        """Test that successful actions don't trigger audit logs."""
        safety_guard.check_decision_touch("action_click", user_id="user_123")
        
        # Should not be logged (it's a success)
        mock_audit_logger.log_blocked_action.assert_not_called()
