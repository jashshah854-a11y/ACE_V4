"""
Phase 5.25: Automated Pattern Emergence Monitor.

Continuously observes decision and outcome logs to detect repetition 
without generating insights or breaking silence.

Logic:
1. Groups logs by user_id
2. Scans for interaction -> outcome pairings
3. Emits PatternCandidate if N >= 3
4. Sets phase5_3_ready = true if pattern persists > 7 days

Phase 6.0 Safety: Guards against no-consent and caps.
"""

from typing import List, Dict, Optional
from datetime import datetime, timedelta
from collections import defaultdict
from backend.api.decision_models import DecisionTouch, ActionOutcome, PatternCandidate

class PatternMonitor:
    def __init__(
        self, 
        decision_touches: List[DecisionTouch], 
        outcomes: List[ActionOutcome],
        safety_guard=None,
        circuit_breaker=None
    ):
        self.raw_touches = decision_touches
        self.raw_outcomes = outcomes
        self.safety_guard = safety_guard
        self.circuit_breaker = circuit_breaker
        self.candidates: List[PatternCandidate] = []
        self._pattern_cache: Dict[str, List[tuple]] = defaultdict(list)

    def run_analysis(self):
        """Execute the pattern detection logic."""
        self._group_by_user()
        self._scan_for_patterns()
        return self.candidates

    def _group_by_user(self):
        """Group raw logs by user for isolated analysis."""
        # Map outcomes to touches for easier traversal
        self.decision_map = {t.id: t for t in self.raw_touches}
        
        # Build chronological sequence per user
        for outcome in self.raw_outcomes:
            touch = self.decision_map.get(outcome.decision_touch_id)
            if not touch or not touch.user_id:
                continue
                
            # Key: (touch_type, outcome_status)
            entry = (touch.touch_type, outcome.status, outcome.marked_at)
            self._pattern_cache[touch.user_id].append(entry)

        # Sort all user histories by time
        for uid in self._pattern_cache:
            self._pattern_cache[uid].sort(key=lambda x: x[2])

    def _scan_for_patterns(self):
        """Detect repetition (N >= 3) for each user."""
        for user_id, history in self._pattern_cache.items():
            # Safety Guard: Check pattern monitor permission for this user
            if self.safety_guard:
                decision = self.safety_guard.check_pattern_monitor(user_id, request_id=f"pattern_scan_{user_id}")
                if not decision.allow:
                    # Skip this user - they don't have consent or hit cap
                    continue
            
            # Simply count frequency of (touch_type, outcome_tag) pairs
            # In V1, we only look for atomic pairings: Touch -> Outcome
            pair_counts = defaultdict(list)
            
            for touch_type, status, timestamp in history:
                key = f"{touch_type} -> {status}"
                pair_counts[key].append(timestamp)

            # Check thresholds
            for sequence_key, timestamps in pair_counts.items():
                if len(timestamps) >= 3:
                    timestamps.sort()
                    first_seen = timestamps[0]
                    last_seen = timestamps[-1]
                    
                    # Create candidate
                    candidate = PatternCandidate(
                        user_id=user_id,
                        interaction_sequence=sequence_key.split(' -> ')[0],
                        outcome_tag=sequence_key.split(' -> ')[1],
                        occurrence_count=len(timestamps),
                        first_seen_at=first_seen,
                        last_seen_at=last_seen
                    )
                    self.candidates.append(candidate)
                    
                    # Record in circuit breaker
                    if self.circuit_breaker:
                        self.circuit_breaker.record_candidate(user_id)

    def check_phase5_3_readiness(self) -> bool:
        """
        Gate Logic:
        - At least one pattern exists
        - Persists for > 7 days
        TODO: "No contradictory pattern" check (omitted for V1 simplicity)
        """
        for cand in self.candidates:
            if cand.age_days >= 7.0:
                return True
        return False

# Mock storage for the monitor (since we don't have DB persistence yet)
# In a real deployed version, this would read from the DB.
GLOBAL_PATTERN_CANDIDATES = []
