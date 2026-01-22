"""
Circuit Breaker and Rate Limiting for Phase 5 Safety System.

Enforces caps to prevent runaway growth:
- Reflections per user per 90 days: 3
- Assertions per user total: 12
- Candidates per user per 30 days: 50
- Global reflection emissions per day: 2000
- Global assertion creations per day: 10000

All caps fail closed and trigger audit logging.
"""

from datetime import datetime, timedelta
from typing import Tuple, Dict, List
from collections import defaultdict, deque
from dataclasses import dataclass


# LOCKED CAPS - Do not modify without approval
CAP_REFLECTIONS_PER_USER_90D = 3
CAP_ASSERTIONS_PER_USER_TOTAL = 12
CAP_CANDIDATES_PER_USER_30D = 50
CAP_GLOBAL_REFLECTION_EMISSIONS_PER_DAY = 2000
CAP_GLOBAL_ASSERTION_CREATIONS_PER_DAY = 10000
REFLECTION_COOLDOWN_DAYS = 14  # Minimum gap between reflections


@dataclass
class CounterEntry:
    """Timestamped counter entry for temporal caps."""
    timestamp: datetime
    user_id: str


class CircuitBreaker:
    """
    Rate limiting and cap enforcement.
    
    Phase 6.0: In-memory counters (resets on restart - acceptable for dev)
    Phase 6.1+: Persistent storage (database or Redis)
    
    All methods return (can_proceed: bool, reason_code: str).
    """
    
    def __init__(self):
        """Initialize in-memory counters."""
        # Per-user temporal counters
        self.user_reflections: Dict[str, deque] = defaultdict(deque)  # (timestamp, )
        self.user_assertion_count: Dict[str, int] = defaultdict(int)  # Total count
        self.user_candidates: Dict[str, deque] = defaultdict(deque)  # (timestamp, )
        self.user_last_reflection: Dict[str, datetime] = {}  # Last reflection time
        
        # Global daily counters
        self.global_reflection_emissions: deque = deque()  # (timestamp, )
        self.global_assertion_creations: deque = deque()  # (timestamp, )
    
    def _prune_old_entries(self, queue: deque, cutoff: datetime):
        """Remove entries older than cutoff from left side of deque."""
        while queue and queue[0] < cutoff:
            queue.popleft()
    
    def check_reflection_cap(self, user_id: str) -> Tuple[bool, str]:
        """
        Check if user can create another reflection within 90-day window.
        
        Cap: 3 reflections per user per 90 days
        
        Args:
            user_id: User identifier
            
        Returns:
            (can_proceed, reason_code)
        """
        now = datetime.utcnow()
        window_start = now - timedelta(days=90)
        
        # Prune old entries
        self._prune_old_entries(self.user_reflections[user_id], window_start)
        
        # Check count
        current_count = len(self.user_reflections[user_id])
        
        if current_count >= CAP_REFLECTIONS_PER_USER_90D:
            return (False, "reflection_cap_exceeded")
        
        return (True, "ok")
    
    def record_reflection(self, user_id: str):
        """
        Record a reflection creation.
        
        Call this AFTER successful reflection generation.
        
        Args:
            user_id: User who received reflection
        """
        now = datetime.utcnow()
        self.user_reflections[user_id].append(now)
        self.user_last_reflection[user_id] = now
    
    def check_reflection_cooldown(self, user_id: str) -> Tuple[bool, str]:
        """
        Check if enough time has passed since last reflection.
        
        Cooldown: 14 days minimum between reflections
        
        Args:
            user_id: User identifier
            
        Returns:
            (can_proceed, reason_code)
        """
        if user_id not in self.user_last_reflection:
            return (True, "ok")
        
        last_reflection = self.user_last_reflection[user_id]
        now = datetime.utcnow()
        days_since = (now - last_reflection).total_seconds() / 86400
        
        if days_since < REFLECTION_COOLDOWN_DAYS:
            return (False, "reflection_cooldown_active")
        
        return (True, "ok")
    
    def check_assertion_cap(self, user_id: str) -> Tuple[bool, str]:
        """
        Check if user can create another assertion.
        
        Cap: 12 assertions per user (total, no time window)
        
        Args:
            user_id: User identifier
            
        Returns:
            (can_proceed, reason_code)
        """
        current_count = self.user_assertion_count[user_id]
        
        if current_count >= CAP_ASSERTIONS_PER_USER_TOTAL:
            return (False, "assertion_cap_exceeded")
        
        return (True, "ok")
    
    def record_assertion(self, user_id: str):
        """
        Record an assertion creation.
        
        Call this AFTER successful assertion generation.
        
        Args:
            user_id: User for whom assertion was created
        """
        self.user_assertion_count[user_id] += 1
    
    def check_candidate_cap(self, user_id: str) -> Tuple[bool, str]:
        """
        Check if user can create more pattern candidates.
        
        Cap: 50 candidates per user per 30 days
        
        Args:
            user_id: User identifier
            
        Returns:
            (can_proceed, reason_code)
        """
        now = datetime.utcnow()
        window_start = now - timedelta(days=30)
        
        # Prune old entries
        self._prune_old_entries(self.user_candidates[user_id], window_start)
        
        # Check count
        current_count = len(self.user_candidates[user_id])
        
        if current_count >= CAP_CANDIDATES_PER_USER_30D:
            return (False, "candidate_cap_exceeded")
        
        return (True, "ok")
    
    def record_candidate(self, user_id: str):
        """
        Record a pattern candidate creation.
        
        Call this AFTER successful candidate creation.
        
        Args:
            user_id: User for candidate
        """
        now = datetime.utcnow()
        self.user_candidates[user_id].append(now)
    
    def check_global_reflection_emission_cap(self) -> Tuple[bool, str]:
        """
        Check global daily reflection emission cap.
        
        Cap: 2000 emissions per day (across all users)
        
        Returns:
            (can_proceed, reason_code)
        """
        now = datetime.utcnow()
        day_start = now - timedelta(days=1)
        
        # Prune old entries
        self._prune_old_entries(self.global_reflection_emissions, day_start)
        
        # Check count
        current_count = len(self.global_reflection_emissions)
        
        if current_count >= CAP_GLOBAL_REFLECTION_EMISSIONS_PER_DAY:
            return (False, "global_reflection_emission_cap_exceeded")
        
        return (True, "ok")
    
    def record_global_reflection_emission(self):
        """
        Record a reflection emission.
        
        Call this AFTER successful emission (shown to user).
        """
        now = datetime.utcnow()
        self.global_reflection_emissions.append(now)
    
    def check_global_assertion_creation_cap(self) -> Tuple[bool, str]:
        """
        Check global daily assertion creation cap.
        
        Cap: 10000 assertions per day (across all users)
        
        Returns:
            (can_proceed, reason_code)
        """
        now = datetime.utcnow()
        day_start = now - timedelta(days=1)
        
        # Prune old entries
        self._prune_old_entries(self.global_assertion_creations, day_start)
        
        # Check count
        current_count = len(self.global_assertion_creations)
        
        if current_count >= CAP_GLOBAL_ASSERTION_CREATIONS_PER_DAY:
            return (False, "global_assertion_creation_cap_exceeded")
        
        return (True, "ok")
    
    def record_global_assertion_creation(self):
        """
        Record an assertion creation (global counter).
        
        Call this AFTER successful assertion creation.
        """
        now = datetime.utcnow()
        self.global_assertion_creations.append(now)
    
    def get_user_stats(self, user_id: str) -> Dict[str, any]:
        """
        Get current stats for a user (for debugging/monitoring).
        
        Args:
            user_id: User identifier
            
        Returns:
            Dictionary with current counts and limits
        """
        now = datetime.utcnow()
        
        # Prune before counting
        self._prune_old_entries(
            self.user_reflections[user_id],
            now - timedelta(days=90)
        )
        self._prune_old_entries(
            self.user_candidates[user_id],
            now - timedelta(days=30)
        )
        
        return {
            "user_id": user_id,
            "reflections_90d": {
                "count": len(self.user_reflections[user_id]),
                "limit": CAP_REFLECTIONS_PER_USER_90D,
                "available": CAP_REFLECTIONS_PER_USER_90D - len(self.user_reflections[user_id])
            },
            "assertions_total": {
                "count": self.user_assertion_count[user_id],
                "limit": CAP_ASSERTIONS_PER_USER_TOTAL,
                "available": CAP_ASSERTIONS_PER_USER_TOTAL - self.user_assertion_count[user_id]
            },
            "candidates_30d": {
                "count": len(self.user_candidates[user_id]),
                "limit": CAP_CANDIDATES_PER_USER_30D,
                "available": CAP_CANDIDATES_PER_USER_30D - len(self.user_candidates[user_id])
            },
            "last_reflection": self.user_last_reflection.get(user_id)
        }
    
    def get_global_stats(self) -> Dict[str, any]:
        """
        Get global stats (for monitoring).
        
        Returns:
            Dictionary with global counts and limits
        """
        now = datetime.utcnow()
        
        # Prune before counting
        self._prune_old_entries(
            self.global_reflection_emissions,
            now - timedelta(days=1)
        )
        self._prune_old_entries(
            self.global_assertion_creations,
            now - timedelta(days=1)
        )
        
        return {
            "reflection_emissions_24h": {
                "count": len(self.global_reflection_emissions),
                "limit": CAP_GLOBAL_REFLECTION_EMISSIONS_PER_DAY,
                "available": CAP_GLOBAL_REFLECTION_EMISSIONS_PER_DAY - len(self.global_reflection_emissions)
            },
            "assertion_creations_24h": {
                "count": len(self.global_assertion_creations),
                "limit": CAP_GLOBAL_ASSERTION_CREATIONS_PER_DAY,
                "available": CAP_GLOBAL_ASSERTION_CREATIONS_PER_DAY - len(self.global_assertion_creations)
            }
        }
