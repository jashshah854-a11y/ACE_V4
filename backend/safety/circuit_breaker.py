"""
Phase 6.1: Circuit Breaker

Prevents runaway growth and emission.
Tracks counts and enforces caps to maintain system health.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger("ace.circuit_breaker")


@dataclass
class CircuitState:
    """Current state of circuit breaker counters."""
    global_reflection_count: int = 0
    global_candidate_count: int = 0
    global_assertion_count: int = 0
    per_user_reflection_count: Dict[str, int] = None
    per_user_candidate_count: Dict[str, int] = None
    last_reset_at: datetime = None
    
    def __post_init__(self):
        if self.per_user_reflection_count is None:
            self.per_user_reflection_count = {}
        if self.per_user_candidate_count is None:
            self.per_user_candidate_count = {}
        if self.last_reset_at is None:
            self.last_reset_at = datetime.now(timezone.utc)


class CircuitBreaker:
    """
    Prevents runaway growth in memory operations.
    
    Caps:
    - Global reflection emissions per day
    - Per-user reflection emissions per day
    - Pattern candidates per user
    - Assertions per user
    """
    
    # Default caps
    GLOBAL_REFLECTION_CAP_PER_DAY = 1000
    PER_USER_REFLECTION_CAP_PER_DAY = 5
    PER_USER_CANDIDATE_CAP = 100
    PER_USER_ASSERTION_CAP = 50
    
    def __init__(self, reset_window_hours: int = 24):
        self.reset_window = timedelta(hours=reset_window_hours)
        self.state = CircuitState()
    
    def record_global_reflection_emission(self):
        """Record a global reflection emission."""
        self._check_reset()
        self.state.global_reflection_count += 1
        logger.info(f"[CIRCUIT] Global reflections: {self.state.global_reflection_count}/{self.GLOBAL_REFLECTION_CAP_PER_DAY}")
    
    def record_user_reflection(self, user_id: str):
        """Record a reflection for a specific user."""
        self._check_reset()
        if user_id not in self.state.per_user_reflection_count:
            self.state.per_user_reflection_count[user_id] = 0
        self.state.per_user_reflection_count[user_id] += 1
        logger.debug(f"[CIRCUIT] User {user_id} reflections: {self.state.per_user_reflection_count[user_id]}/{self.PER_USER_REFLECTION_CAP_PER_DAY}")
    
    def record_candidate(self, user_id: str):
        """Record a pattern candidate for a user."""
        if user_id not in self.state.per_user_candidate_count:
            self.state.per_user_candidate_count[user_id] = 0
        self.state.per_user_candidate_count[user_id] += 1
    
    def check_global_reflection_cap(self) -> bool:
        """Check if global reflection cap has been exceeded."""
        self._check_reset()
        return self.state.global_reflection_count < self.GLOBAL_REFLECTION_CAP_PER_DAY
    
    def check_user_reflection_cap(self, user_id: str) -> bool:
        """Check if user has exceeded their reflection cap."""
        self._check_reset()
        count = self.state.per_user_reflection_count.get(user_id, 0)
        return count < self.PER_USER_REFLECTION_CAP_PER_DAY
    
    def check_user_candidate_cap(self, user_id: str) -> bool:
        """Check if user has exceeded their candidate cap."""
        count = self.state.per_user_candidate_count.get(user_id, 0)
        return count < self.PER_USER_CANDIDATE_CAP
    
    def _check_reset(self):
        """Reset counters if window has elapsed."""
        now = datetime.now(timezone.utc)
        if now - self.state.last_reset_at >= self.reset_window:
            logger.info(f"[CIRCUIT] Resetting counters (window elapsed)")
            self.state.global_reflection_count = 0
            self.state.per_user_reflection_count.clear()
            self.state.last_reset_at = now
    
    def get_state_snapshot(self) -> Dict:
        """Get current circuit breaker state for debugging."""
        return {
            "global_reflection_count": self.state.global_reflection_count,
            "global_candidate_count": self.state.global_candidate_count,
            "per_user_reflection_count": dict(self.state.per_user_reflection_count),
            "per_user_candidate_count": dict(self.state.per_user_candidate_count),
            "last_reset_at": self.state.last_reset_at.isoformat(),
            "caps": {
                "global_reflection_per_day": self.GLOBAL_REFLECTION_CAP_PER_DAY,
                "per_user_reflection_per_day": self.PER_USER_REFLECTION_CAP_PER_DAY,
                "per_user_candidate": self.PER_USER_CANDIDATE_CAP,
                "per_user_assertion": self.PER_USER_ASSERTION_CAP
            }
        }
    
    def force_reset(self):
        """Force reset all counters (for testing)."""
        self.state = CircuitState()
        logger.warning("[CIRCUIT] Force reset triggered")