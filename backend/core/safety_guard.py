"""
Central Safety Guard Module for Phase 5 Intelligence System.

This is the single source of truth for all safety decisions.
Every tracking, generation, and emission path MUST call this guard.

Backend authoritative. Frontend is never trusted.
"""

from datetime import datetime, timedelta
from typing import Tuple, Optional, Dict, Any, Literal
from dataclasses import dataclass
import os


# Touch type whitelist - only these are allowed
ALLOWED_TOUCH_TYPES = {
    'action_view',
    'action_click', 
    'evidence_expand',
    'trust_inspect',
    'reflection_dismiss'
}

# Temporal gates (days)
REFLECTION_MIN_PERSISTENCE_DAYS = 7
ASSERTION_MIN_PERSISTENCE_DAYS = 30
REFLECTION_COOLDOWN_DAYS = 14  # Minimum gap between reflections for same user

# Circuit breaker caps (LOCKED - do not modify without approval)
CAP_REFLECTIONS_PER_USER_90D = 3
CAP_ASSERTIONS_PER_USER_TOTAL = 12
CAP_CANDIDATES_PER_USER_30D = 50
CAP_GLOBAL_REFLECTION_EMISSIONS_PER_DAY = 2000
CAP_GLOBAL_ASSERTION_CREATIONS_PER_DAY = 10000


# Canonical reason codes (STABLE - must match between guard and audit logs)
class ReasonCodes:
    """Standardized reason codes for safety decisions."""
    # Success
    OK = "ok"
    
    # Kill switches
    KILL_SWITCH_REFLECTION_GLOBAL_OFF = "kill_switch_reflection_global_off"
    KILL_SWITCH_PATTERN_MONITOR_PAUSE = "kill_switch_pattern_monitor_pause"
    
    # Consent
    NO_CONSENT = "no_consent"
    CONSENT_PROVIDER_UNAVAILABLE = "consent_provider_unavailable"
    
    # Temporal gates
    PATTERN_TOO_YOUNG = "pattern_too_young"
    
    # Circuit breaker caps
    REFLECTION_CAP_EXCEEDED = "reflection_cap_exceeded"
    REFLECTION_COOLDOWN_ACTIVE = "reflection_cooldown_active"
    ASSERTION_CAP_EXCEEDED = "assertion_cap_exceeded"
    CANDIDATE_CAP_EXCEEDED = "candidate_cap_exceeded"
    GLOBAL_REFLECTION_EMISSION_CAP_EXCEEDED = "global_reflection_emission_cap_exceeded"
    GLOBAL_ASSERTION_CREATION_CAP_EXCEEDED = "global_assertion_creation_cap_exceeded"
    CIRCUIT_BREAKER_UNAVAILABLE = "circuit_breaker_unavailable"
    
    # Whitelist
    TOUCH_TYPE_NOT_WHITELISTED = "touch_type_not_whitelisted"


@dataclass
class GuardDecision:
    """Result of a guard check."""
    allow: bool
    reason_code: str
    metadata: Optional[Dict[str, Any]] = None


class SafetyGuard:
    """
    Central safety enforcement module.
    
    All safety logic flows through this class. It checks:
    - Kill switches
    - Consent
    - Touch type whitelist
    - Temporal gates
    - Circuit breaker caps
    
    Returns (allow, reason_code) for every decision.
    """
    
    def __init__(
        self, 
        consent_provider,
        circuit_breaker,
        audit_logger
    ):
        """
        Initialize guard with external dependencies.
        
        Args:
            consent_provider: Provides user consent status
            circuit_breaker: Manages rate caps and counters
            audit_logger: Logs blocked actions
        """
        self.consent_provider = consent_provider
        self.circuit_breaker = circuit_breaker
        self.audit_logger = audit_logger
        
        # Kill switches - read from environment
        self.kill_switch_reflection_off = self._get_env_bool(
            "KILL_SWITCH_REFLECTION_GLOBAL_OFF", 
            default=False
        )
        self.kill_switch_pattern_pause = self._get_env_bool(
            "KILL_SWITCH_PATTERN_MONITOR_PAUSE",
            default=False
        )
    
    def _get_env_bool(self, key: str, default: bool = False) -> bool:
        """Parse boolean from environment variable."""
        value = os.getenv(key, str(default)).lower()
        return value in ('true', '1', 'yes', 'on')
    
    REASON_OK = "ok"
    REASON_NO_CONSENT = "no_consent"
    REASON_CONSENT_PROVIDER_UNAVAILABLE = "consent_provider_unavailable"
    REASON_CIRCUIT_BREAKER_UNAVAILABLE = "circuit_breaker_unavailable"
    REASON_AUDIT_LOGGER_UNAVAILABLE = "audit_logger_unavailable"
    REASON_KILL_SWITCH_REFLECTION_OFF = "kill_switch_reflection_global_off"
    REASON_KILL_SWITCH_PATTERN_PAUSE = "kill_switch_pattern_monitor_pause"
    REASON_PATTERN_TOO_YOUNG = "pattern_too_young"
    REASON_TOUCH_TYPE_NOT_ALLOWED = "touch_type_not_whitelisted"
    def _check_consent_safe(self, user_id: str) -> Tuple[bool, str]:
        """
        Check consent with fail-closed error handling.
        
        On ConsentProvider failure:
        - Returns (False, ReasonCodes.CONSENT_PROVIDER_UNAVAILABLE)
        - Does NOT crash
        
        Args:
            user_id: User to check
            
        Returns:
            (has_consent, reason_code)
        """
        try:
            has_consent = self.consent_provider.get_consent(user_id)
            return (has_consent, ReasonCodes.OK if has_consent else ReasonCodes.NO_CONSENT)
        except Exception as e:
            # FAIL CLOSED: Consent provider failure denies operation
            print(f"[SAFETY_GUARD] ConsentProvider failure: {e}", flush=True)
            return (False, ReasonCodes.CONSENT_PROVIDER_UNAVAILABLE)
    
    def _check_caps(self, cap_check_fn, *args) -> Tuple[bool, str]:
        """
        Execute circuit breaker check with fail-closed error handling.
        
        On CircuitBreaker failure:
        - Returns (False, ReasonCodes.CIRCUIT_BREAKER_UNAVAILABLE)
        - Does NOT crash
        
        Args:
            cap_check_fn: CircuitBreaker method to call
            *args: Arguments to pass
            
        Returns:
            (can_proceed, reason_code)
        """
        try:
            return cap_check_fn(*args)
        except Exception as e:
            # FAIL CLOSED: Circuit breaker failure denies operation
            print(f"[SAFETY_GUARD] CircuitBreaker failure: {e}", flush=True)
            return (False, ReasonCodes.CIRCUIT_BREAKER_UNAVAILABLE)
    
    def _log_decision(
        self,
        action_type: str,
        allowed: bool,
        reason_code: str,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Log a decision (allow or deny) with fail-safe error handling.
        
        On AuditLogger failure for MEMORY operations:
        - Logs internal error
        - Operation continues (for non-critical paths)
        - For critical memory ops, caller should fail closed
        """
        try:
            self.audit_logger.log_decision(
                action_type=action_type,
                allowed=allowed,
                reason_code=reason_code,
                user_id=user_id,
                request_id=request_id,
                kill_switch_snapshot={
                    "reflection_global_off": self.kill_switch_reflection_off,
                    "pattern_monitor_pause": self.kill_switch_pattern_pause
                },
                context=context
            )
        except Exception as e:
            # Log to stderr, but don't crash
            print(f"[SAFETY_GUARD] AuditLogger failure: {e}", flush=True)
            return False
        return True

    def _log_or_fail_closed(
        self,
        action_type: str,
        allowed: bool,
        reason_code: str,
        user_id: Optional[str],
        request_id: Optional[str],
        context: Optional[Dict[str, Any]] = None
    ) -> Optional[GuardDecision]:
        """
        Log a decision; if logging fails, return a fail-closed GuardDecision.
        """
        logged = self._log_decision(
            action_type=action_type,
            allowed=allowed,
            reason_code=reason_code,
            user_id=user_id,
            request_id=request_id,
            context=context
        )
        if logged:
            return None
        return GuardDecision(allow=False, reason_code=ReasonCodes.AUDIT_LOGGER_UNAVAILABLE)
    
    def _log_block(
        self,
        action_type: str,
        reason_code: str,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """DEPRECATED: Use _log_decision instead."""
        self._log_decision(
            action_type =action_type,
            allowed=False,
            reason_code=reason_code,
            user_id=user_id,
            request_id=request_id,
            context=metadata
        )
    
    def check_decision_touch(
        self,
        touch_type: str,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> GuardDecision:
        """
        Check if a decision touch should be recorded.
        
        Gates:
        1. Touch type must be in whitelist
        2. User must have consent
        
        Args:
            touch_type: Type of interaction
            user_id: User identifier
            request_id: Request ID for tracing
            
        Returns:
            GuardDecision with allow=True/False and reason_code
        """
        # Gate 1: Whitelist validation
        if touch_type not in ALLOWED_TOUCH_TYPES:
            failure = self._log_or_fail_closed(
                "decision_touch",
                False,
                ReasonCodes.TOUCH_TYPE_NOT_WHITELISTED,
                user_id,
                request_id,
                {"touch_type": touch_type}
            )
            if failure:
                return failure
            return GuardDecision(
                allow=False,
                reason_code=ReasonCodes.TOUCH_TYPE_NOT_WHITELISTED,
                metadata={"touch_type": touch_type, "allowed": list(ALLOWED_TOUCH_TYPES)}
            )
        
        # Gate 2: Consent check
        if user_id:
            has_consent, consent_reason = self._check_consent_safe(user_id)
            if not has_consent:
                failure = self._log_or_fail_closed(
                    "decision_touch",
                    False,
                    consent_reason,
                    user_id,
                    request_id
                )
                if failure:
                    return failure
                return GuardDecision(
                    allow=False,
                    reason_code=consent_reason
                )
        
        # Success - log allow decision
        failure = self._log_or_fail_closed(
            "decision_touch",
            True,
            ReasonCodes.OK,
            user_id,
            request_id,
            {"touch_type": touch_type}
        )
        if failure:
            return failure
        return GuardDecision(allow=True, reason_code=ReasonCodes.OK)
    
    def check_pattern_monitor(
        self,
        user_id: str,
        request_id: Optional[str] = None
    ) -> GuardDecision:
        """
        Check if pattern monitoring should run.
        
        Gates:
        1. Kill switch PATTERN_MONITOR_PAUSE must be off
        2. User must have consent
        3. Candidate cap not exceeded
        
        Args:
            user_id: User being monitored
            request_id: Request ID for tracing
            
        Returns:
            GuardDecision
        """
        # Gate 1: Kill switch
        if self.kill_switch_pattern_pause:
            failure = self._log_or_fail_closed(
                "pattern_monitor",
                False,
                ReasonCodes.KILL_SWITCH_PATTERN_MONITOR_PAUSE,
                user_id,
                request_id
            )
            if failure:
                return failure
            return GuardDecision(
                allow=False,
                reason_code=ReasonCodes.KILL_SWITCH_PATTERN_MONITOR_PAUSE
            )
        
        # Gate 2: Consent
        has_consent, consent_reason = self._check_consent_safe(user_id)
        if not has_consent:
            failure = self._log_or_fail_closed(
                "pattern_monitor",
                False,
                consent_reason,
                user_id,
                request_id
            )
            if failure:
                return failure
            return GuardDecision(
                allow=False,
                reason_code=consent_reason
            )
        
        # Gate 3: Candidate cap
        can_create, cap_reason = self._check_caps(
            self.circuit_breaker.check_candidate_cap,
            user_id
        )
        if not can_create:
            failure = self._log_or_fail_closed(
                "pattern_monitor",
                False,
                cap_reason,
                user_id,
                request_id
            )
            if failure:
                return failure
            return GuardDecision(
                allow=False,
                reason_code=cap_reason
            )
        
        # Success
        failure = self._log_or_fail_closed(
            "pattern_monitor",
            True,
            ReasonCodes.OK,
            user_id,
            request_id
        )
        if failure:
            return failure
        return GuardDecision(allow=True, reason_code=ReasonCodes.OK)
    
    def check_reflection_generation(
        self,
        user_id: str,
        pattern_age_days: float,
        request_id: Optional[str] = None
    ) -> GuardDecision:
        """
        Check if reflection can be generated.
        
        Gates:
        1. Kill switch REFLECTION_GLOBAL_OFF must be off
        2. User must have consent
        3. Pattern must be >= 7 days old
        4. Reflection cap not exceeded
        5. Cooldown period respected
        
        Args:
            user_id: Target user
            pattern_age_days: Age of pattern in days
            request_id: Request ID for tracing
            
        Returns:
            GuardDecision
        """
        # Gate 1: Kill switch
        if self.kill_switch_reflection_off:
            failure = self._log_or_fail_closed(
                "reflection_generation",
                False,
                self.REASON_KILL_SWITCH_REFLECTION_OFF,
                user_id,
                request_id
            )
            if failure:
                return failure
            return GuardDecision(
                allow=False,
                reason_code=self.REASON_KILL_SWITCH_REFLECTION_OFF
            )
        
        # Gate 2: Consent
        has_consent, consent_reason = self._check_consent_safe(user_id)
        if not has_consent:
            failure = self._log_or_fail_closed(
                "reflection_generation",
                False,
                consent_reason,
                user_id,
                request_id
            )
            if failure:
                return failure
            return GuardDecision(
                allow=False,
                reason_code=consent_reason
            )
        
        # Gate 3: Temporal gate (7 days)
        if pattern_age_days < REFLECTION_MIN_PERSISTENCE_DAYS:
            failure = self._log_or_fail_closed(
                "reflection_generation",
                False,
                self.REASON_PATTERN_TOO_YOUNG,
                user_id,
                request_id,
                {
                    "pattern_age_days": pattern_age_days,
                    "required_days": REFLECTION_MIN_PERSISTENCE_DAYS
                }
            )
            if failure:
                return failure
            return GuardDecision(
                allow=False,
                reason_code=self.REASON_PATTERN_TOO_YOUNG,
                metadata={
                    "pattern_age_days": pattern_age_days,
                    "required_days": REFLECTION_MIN_PERSISTENCE_DAYS
                }
            )
        
        # Gate 4: Reflection cap
        can_create, cap_reason = self._check_caps(
            self.circuit_breaker.check_reflection_cap,
            user_id
        )
        if not can_create:
            failure = self._log_or_fail_closed(
                "reflection_generation",
                False,
                cap_reason,
                user_id,
                request_id
            )
            if failure:
                return failure
            return GuardDecision(
                allow=False,
                reason_code=cap_reason
            )
        
        # Gate 5: Cooldown check
        can_emit, cooldown_reason = self._check_caps(
            self.circuit_breaker.check_reflection_cooldown,
            user_id
        )
        if not can_emit:
            failure = self._log_or_fail_closed(
                "reflection_generation",
                False,
                cooldown_reason,
                user_id,
                request_id
            )
            if failure:
                return failure
            return GuardDecision(
                allow=False,
                reason_code=cooldown_reason
            )
        
        # Success
        failure = self._log_or_fail_closed(
            "reflection_generation",
            True,
            self.REASON_OK,
            user_id,
            request_id,
            {"pattern_age_days": pattern_age_days}
        )
        if failure:
            return failure
        return GuardDecision(allow=True, reason_code="ok")
    
    def check_reflection_emission(
        self,
        user_id: str,
        reflection_id: str,
        request_id: Optional[str] = None
    ) -> GuardDecision:
        """
        Check if reflection can be emitted (shown to user).
        
        Gates:
        1. Kill switch REFLECTION_GLOBAL_OFF must be off
        2. User must have consent
        3. Global daily emission cap not exceeded
        
        Args:
            user_id: Target user
            reflection_id: Reflection to emit
            request_id: Request ID for tracing
            
        Returns:
            GuardDecision
        """
        # Gate 1: Kill switch
        if self.kill_switch_reflection_off:
            failure = self._log_or_fail_closed(
                "reflection_emission",
                False,
                self.REASON_KILL_SWITCH_REFLECTION_OFF,
                user_id,
                request_id,
                {"reflection_id": reflection_id}
            )
            if failure:
                return failure
            return GuardDecision(
                allow=False,
                reason_code=self.REASON_KILL_SWITCH_REFLECTION_OFF
            )
        
        # Gate 2: Consent
        has_consent, consent_reason = self._check_consent_safe(user_id)
        if not has_consent:
            failure = self._log_or_fail_closed(
                "reflection_emission",
                False,
                consent_reason,
                user_id,
                request_id
            )
            if failure:
                return failure
            return GuardDecision(
                allow=False,
                reason_code=consent_reason
            )
        
        # Gate 3: Global daily cap
        can_emit, cap_reason = self._check_caps(
            self.circuit_breaker.check_global_reflection_emission_cap
        )
        if not can_emit:
            failure = self._log_or_fail_closed(
                "reflection_emission",
                False,
                cap_reason,
                user_id,
                request_id
            )
            if failure:
                return failure
            return GuardDecision(
                allow=False,
                reason_code=cap_reason
            )
        
        # Success
        failure = self._log_or_fail_closed(
            "reflection_emission",
            True,
            self.REASON_OK,
            user_id,
            request_id,
            {"reflection_id": reflection_id}
        )
        if failure:
            return failure
        return GuardDecision(allow=True, reason_code="ok")
    
    def check_assertion_creation(
        self,
        user_id: str,
        pattern_age_days: float,
        request_id: Optional[str] = None
    ) -> GuardDecision:
        """
        Check if assertion can be created.
        
        Gates:
        1. User must have consent
        2. Pattern must be >= 30 days old
        3. Assertion cap not exceeded
        4. Global daily assertion cap not exceeded
        
        Args:
            user_id: Target user
            pattern_age_days: Age of pattern in days
            request_id: Request ID for tracing
            
        Returns:
            GuardDecision
        """
        # Gate 1: Consent
        has_consent, consent_reason = self._check_consent_safe(user_id)
        if not has_consent:
            failure = self._log_or_fail_closed(
                "assertion_creation",
                False,
                consent_reason,
                user_id,
                request_id
            )
            if failure:
                return failure
            return GuardDecision(
                allow=False,
                reason_code=consent_reason
            )
        
        # Gate 2: Temporal gate (30 days)
        if pattern_age_days < ASSERTION_MIN_PERSISTENCE_DAYS:
            failure = self._log_or_fail_closed(
                "assertion_creation",
                False,
                self.REASON_PATTERN_TOO_YOUNG,
                user_id,
                request_id,
                {
                    "pattern_age_days": pattern_age_days,
                    "required_days": ASSERTION_MIN_PERSISTENCE_DAYS
                }
            )
            if failure:
                return failure
            return GuardDecision(
                allow=False,
                reason_code=self.REASON_PATTERN_TOO_YOUNG,
                metadata={
                    "pattern_age_days": pattern_age_days,
                    "required_days": ASSERTION_MIN_PERSISTENCE_DAYS
                }
            )
        
        # Gate 3: User assertion cap
        can_create, cap_reason = self._check_caps(
            self.circuit_breaker.check_assertion_cap,
            user_id
        )
        if not can_create:
            failure = self._log_or_fail_closed(
                "assertion_creation",
                False,
                cap_reason,
                user_id,
                request_id
            )
            if failure:
                return failure
            return GuardDecision(
                allow=False,
                reason_code=cap_reason
            )
        
        # Gate 4: Global daily cap
        can_create_global, global_cap_reason = self._check_caps(
            self.circuit_breaker.check_global_assertion_creation_cap
        )
        if not can_create_global:
            failure = self._log_or_fail_closed(
                "assertion_creation",
                False,
                global_cap_reason,
                user_id,
                request_id
            )
            if failure:
                return failure
            return GuardDecision(
                allow=False,
                reason_code=global_cap_reason
            )
        
        # Success
        failure = self._log_or_fail_closed(
            "assertion_creation",
            True,
            self.REASON_OK,
            user_id,
            request_id,
            {"pattern_age_days": pattern_age_days}
        )
        if failure:
            return failure
        return GuardDecision(allow=True, reason_code="ok")
