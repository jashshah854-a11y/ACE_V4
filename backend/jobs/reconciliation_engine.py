"""
Phase 6: Memory Reconciliation Engine

Maintains internal coherence by resolving conflicts between beliefs.
Adjusts confidence, never flips truth.
Preserves contradictions at reduced confidence.

Core question: "When my memories disagree, which one do I trust more?"
Answer: Adjust confidence gradually. Never flip truth. Preserve contradictions.
"""

from typing import List, Dict, Optional
import os
from datetime import datetime, timedelta, timezone
from backend.api.decision_models import (
    MemoryAssertion,
    PatternCandidate,
    ReconciliationNote,
    BeliefCoherenceState
)


class ReconciliationEngine:
    """
    Internal belief reconciliation system.
    
    Resolves conflicts between memory assertions by:
    - Detecting contradictions
    - Adjusting confidence (not truth)
    - Preserving multiple beliefs at reduced confidence
    - Applying decay rules
    - Maintaining internal coherence state
    
    CRITICAL: Zero user-facing output. Internal only.
    """
    
    def __init__(self,
                 assertions: List[MemoryAssertion],
                 existing_notes: List[ReconciliationNote],
                 existing_state: Optional[BeliefCoherenceState] = None):
        self.assertions = assertions
        self.notes = existing_notes
        self.coherence_state = existing_state
        self.new_notes: List[ReconciliationNote] = []
    
    def evaluate_coherence(self, user_id: str) -> BeliefCoherenceState:
        """
        Main reconciliation loop for a user.
        
        Steps:
        1. Detect contradictions
        2. Resolve by reducing confidence
        3. Check for reinforcement opportunities
        4. Apply decay rules
        5. Update coherence state
        """
        user_assertions = [a for a in self.assertions if a.user_id == user_id]
        
        if len(user_assertions) == 0:
            return BeliefCoherenceState(
                user_id=user_id,
                current_state='insufficient_data',
                assertion_count=0,
                contradiction_count=0
            )
        
        # Step 0: SAFETY KILL SWITCH
        if self._check_kill_switch():
            return BeliefCoherenceState(
                user_id=user_id,
                current_state='suspended',
                assertion_count=len(user_assertions),
                contradiction_count=0,
                state_history=self.coherence_state.state_history if self.coherence_state else []
            )
        
        # Step 1 & 2: Detect and resolve contradictions
        contradiction_count = self._resolve_contradictions(user_id, user_assertions)
        
        # Step 3: Check reinforcement (future enhancement)
        # self._check_reinforcement(user_id, user_assertions)
        
        # Step 4: Apply decay
        self._apply_decay_rules(user_id, user_assertions)
        
        # Step 5: Calculate state
        new_state = self._calculate_coherence_state(user_id, user_assertions, contradiction_count)
        
        return new_state
    
    def _resolve_contradictions(self, user_id: str, assertions: List[MemoryAssertion]) -> int:
        """
        Detect contradictions and reduce confidence of conflicting beliefs.
        
        Contradiction: Same interaction pattern, different outcomes
        Resolution: Reduce confidence of BOTH assertions
        """
        # Group by interaction pattern
        pattern_groups: Dict[str, List[MemoryAssertion]] = {}
        
        for assertion in assertions:
            # Extract interaction part (before "has preceded")
            parts = assertion.assertion_text.split(' has preceded ')
            if len(parts) == 2:
                interaction = parts[0].lower()
                if interaction not in pattern_groups:
                    pattern_groups[interaction] = []
                pattern_groups[interaction].append(assertion)
        
        contradiction_count = 0
        
        # Detect contradictions
        for interaction, group in pattern_groups.items():
            if len(group) > 1:
               # Multiple outcomes for same interaction = contradiction
                contradiction_count += 1
                
                # Record confidence before
                confidence_before = {a.assertion_id: a.confidence_level for a in group}
                
                # Reduce confidence
                for assertion in group:
                    if assertion.confidence_level == 'medium':
                        assertion.confidence_level = 'low'
                    # Already 'low' stays 'low'
                
                # Record confidence after
                confidence_after = {a.assertion_id: a.confidence_level for a in group}
                
                # Create reconciliation note
                note = ReconciliationNote(
                    user_id=user_id,
                    assertion_ids=[a.assertion_id for a in group],
                    reconciliation_type='contradiction',
                    confidence_before=confidence_before,
                    confidence_after=confidence_after,
                    reasoning=f"Detected contradiction: '{interaction}' associated with multiple outcomes. Reduced confidence to preserve uncertainty."
                )
                self.new_notes.append(note)
        
        return contradiction_count
    
    def _apply_decay_rules(self, user_id: str, assertions: List[MemoryAssertion]):
        """
        Apply 60-day decay to assertions not reinforced recently.
        
        Rules:
        - 60+ days since reinforcement:
          - medium → low
          - low → (mark for deletion, handled elsewhere)
        """
        for assertion in assertions:
            days_since = assertion.days_since_reinforcement
            
            if days_since >= 60.0:
                if assertion.confidence_level == 'medium':
                    # Create decay note
                    note = ReconciliationNote(
                        user_id=user_id,
                        assertion_ids=[assertion.assertion_id],
                        reconciliation_type='decay',
                        confidence_before={assertion.assertion_id: 'medium'},
                        confidence_after={assertion.assertion_id: 'low'},
                        reasoning=f"Assertion not reinforced for {days_since:.0f} days. Reduced confidence due to staleness."
                    )
                    self.new_notes.append(note)
                    
                    # Apply decay
                    assertion.confidence_level = 'low'
    
    def _calculate_coherence_state(self, 
                                   user_id: str, 
                                   assertions: List[MemoryAssertion],
                                   contradiction_count: int) -> BeliefCoherenceState:
        """
        Calculate overall coherence state for user.
        
        States:
        - insufficient_data: < 2 assertions
        - decaying: Many assertions aging (60+ days)
        - unstable: Active contradictions
        - stable: No contradictions, recent reinforcement
        """
        assertion_count = len(assertions)
        
        if assertion_count < 2:
            state = 'insufficient_data'
        elif contradiction_count > 0:
            state = 'unstable'
        else:
            # Check if many are decaying
            decaying_count = sum(1 for a in assertions if a.days_since_reinforcement >= 60.0)
            if decaying_count >= assertion_count * 0.5:
                state = 'decaying'
            else:
                state = 'stable'
        
        # Track state transition if it changed
        state_history = []
        if self.coherence_state and self.coherence_state.current_state != state:
            state_history = self.coherence_state.state_history.copy()
            state_history.append({
                'from_state': self.coherence_state.current_state,
                'to_state': state,
                'transitioned_at': datetime.now(timezone.utc).isoformat(),
                'reason': f"Contradictions: {contradiction_count}, Assertions: {assertion_count}"
            })
            # Keep last 10 transitions
            state_history = state_history[-10:]
        
        return BeliefCoherenceState(
            user_id=user_id,
            current_state=state,
            assertion_count=assertion_count,
            contradiction_count=contradiction_count,
            state_history=state_history
        )
    
    def get_reconciliation_notes(self) -> List[ReconciliationNote]:
        """Return all reconciliation notes created during this evaluation."""
        return self.new_notes

    def _check_kill_switch(self) -> bool:
        """
        Safety override: Check if global stop is requested.
        Adheres to 'Kill switches override all other controls'.
        """
        # Env var check - simple mechanical stop
        return os.getenv("ACE_KILL_SWITCH", "false").lower() == "true"
