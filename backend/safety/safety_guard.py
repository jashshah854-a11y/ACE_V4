"""
Phase 6.1: Centralized Safety Guard

Authoritative enforcement for all Phase 5/6 operations.
Backend is the single source of truth for:
- User consent
- Kill switches
- Permission checks
- Audit logging

Every endpoint and pipeline job must call this guard.
"""

from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger("ace.safety")


class BlockReasonCode(Enum):
    """Standard reason codes for blocked actions."""
    NO_CONSENT = "no_consent"
    KILL_SWITCH_ACTIVE = "kill_switch_active"
    CAP_EXCEEDED = "cap_exceeded"
    COOLDOWN_ACTIVE = "cooldown_active"
    INVALID_INPUT = "invalid_input"
    PATTERN_TOO_YOUNG = "pattern_too_young"
    ASSERTION_TOO_YOUNG = "assertion_too_young"


@dataclass
class SafetyDecision:
    """Result of a safety check."""
    allow: bool
    reason_code: Optional[BlockReasonCode] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class ConsentProvider:
    """
    Interface for checking user consent.
    In production, this would query a database or consent service.
    For V1, we use in-memory tracking.
    """
    
    def __init__(self):
        self._consent_records: Dict[str, bool] = {}
        # Default to False - no implicit consent
        self._default_consent = False
    
    def check_consent(self, user_id: str) -> bool:
        """Check if user has given consent for memory tracking."""
        return self._consent_records.get(user_id, self._default_consent)
    
    def grant_consent(self, user_id: str):
        """Record user consent."""
        self._consent_records[user_id] = True
        logger.info(f"[CONSENT] Granted for user {user_id}")
    
    def revoke_consent(self, user_id: str):
        """Revoke user consent."""
        self._consent_records[user_id] = False
        logger.info(f"[CONSENT] Revoked for user {user_id}")
    
    def get_all_consented_users(self) -> list[str]:
        """Get list of all users with active consent."""
        return [uid for uid, consented in self._consent_records.items() if consented]


class SafetyGuard:
    """
    Centralized safety enforcement for Phase 5/6.
    
    All memory operations must be approved by this guard.
    Provides audit logging for all blocked actions.
    """
    
    def __init__(self, consent_provider: ConsentProvider):
        self.consent_provider = consent_provider
        
        # Kill switches
        self.kill_switch_reflection_off = False
        self.kill_switch_pattern_monitor_pause = False
        
        # Audit log
        self._audit_log: list[Dict] = []
    
    def check_decision_capture(self, user_id: str, touch_type: str, request_id: str) -> SafetyDecision:
        """
        Check if decision touch can be captured.
        
        Rules:
        - User must have consent
        - Touch type must be in whitelist
        """
        # Check consent
        if not self.consent_provider.check_consent(user_id):
            self._log_blocked_action(
                action="decision_capture",
                user_id=user_id,
                reason=BlockReasonCode.NO_CONSENT,
                metadata={"touch_type": touch_type, "request_id": request_id}
            )
            return SafetyDecision(
                allow=False,
                reason_code=BlockReasonCode.NO_CONSENT,
                metadata={"user_id": user_id}
            )
        
        # Check touch type whitelist
        allowed_types = ['action_view', 'action_click', 'evidence_expand', 'trust_inspect', 'reflection_dismiss']
        if touch_type not in allowed_types:
            self._log_blocked_action(
                action="decision_capture",
                user_id=user_id,
                reason=BlockReasonCode.INVALID_INPUT,
                metadata={"touch_type": touch_type, "request_id": request_id}
            )
            return SafetyDecision(
                allow=False,
                reason_code=BlockReasonCode.INVALID_INPUT,
                metadata={"invalid_touch_type": touch_type}
            )
        
        return SafetyDecision(allow=True)
    
    def check_pattern_monitor(self, user_id: str, request_id: str) -> SafetyDecision:
        """
        Check if pattern monitoring is allowed for a user.
        
        Rules:
        - Kill switch check
        - User must have consent
        """
        # Check kill switch
        if self.kill_switch_pattern_monitor_pause:
            self._log_blocked_action(
                action="pattern_monitor",
                user_id=user_id,
                reason=BlockReasonCode.KILL_SWITCH_ACTIVE,
                metadata={"request_id": request_id}
            )
            return SafetyDecision(
                allow=False,
                reason_code=BlockReasonCode.KILL_SWITCH_ACTIVE
            )
        
        # Check consent
        if not self.consent_provider.check_consent(user_id):
            return SafetyDecision(
                allow=False,
                reason_code=BlockReasonCode.NO_CONSENT
            )
        
        return SafetyDecision(allow=True)
    
    def check_reflection_emission(self, user_id: str, reflection_id: str, request_id: str) -> SafetyDecision:
        """
        Check if reflection can be emitted to user.
        
        Rules:
        - Kill switch check
        - User must have consent
        - Circuit breaker caps (checked elsewhere)
        """
        # Check kill switch
        if self.kill_switch_reflection_off:
            self._log_blocked_action(
                action="reflection_emission",
                user_id=user_id,
                reason=BlockReasonCode.KILL_SWITCH_ACTIVE,
                metadata={"reflection_id": reflection_id, "request_id": request_id}
            )
            return SafetyDecision(
                allow=False,
                reason_code=BlockReasonCode.KILL_SWITCH_ACTIVE
            )
        
        # Check consent
        if not self.consent_provider.check_consent(user_id):
            self._log_blocked_action(
                action="reflection_emission",
                user_id=user_id,
                reason=BlockReasonCode.NO_CONSENT,
                metadata={"reflection_id": reflection_id}
            )
            return SafetyDecision(
                allow=False,
                reason_code=BlockReasonCode.NO_CONSENT
            )
        
        return SafetyDecision(allow=True)
    
    def _log_blocked_action(self, action: str, user_id: str, reason: BlockReasonCode, metadata: Dict = None):
        """Log blocked action with full context."""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "action": action,
            "user_id": user_id,
            "reason": reason.value,
            "metadata": metadata or {},
            "switch_state": {
                "reflection_off": self.kill_switch_reflection_off,
                "pattern_monitor_pause": self.kill_switch_pattern_monitor_pause
            }
        }
        self._audit_log.append(log_entry)
        logger.warning(f"[SAFETY_BLOCK] {action} blocked for {user_id}: {reason.value}")
    
    def get_audit_log(self, since: Optional[datetime] = None) -> list[Dict]:
        """Retrieve audit log entries."""
        if since:
            return [
                entry for entry in self._audit_log
                if datetime.fromisoformat(entry['timestamp']) >= since
            ]
        return self._audit_log.copy()
    
    def clear_audit_log(self):
        """Clear audit log (for testing)."""
        self._audit_log.clear()
