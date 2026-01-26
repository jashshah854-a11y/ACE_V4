"""
Memory Assertion Engine: Autonomous belief formation system.

Converts long-lived patterns (30+ days) into soft internal beliefs.
Handles contradictions via confidence reduction.
Applies 60-day decay to stale assertions.

CRITICAL: These assertions are NEVER shown to users.
"""

from typing import List, Optional, Dict
from datetime import datetime, timedelta, timezone
import uuid
from backend.api.decision_models import (
    PatternCandidate,
    Reflection,
    MemoryAssertion,
    UserMemoryState
)


class AssertionEngine:
    """
    Autonomous Memory Assertion Engine.
    
    Operates silently to convert mature patterns into soft beliefs.
    Preserves uncertainty and contradiction.
    """
    
    def __init__(self, 
                 patterns: List[PatternCandidate],
                 reflections: List[Reflection],
                 existing_assertions: List[MemoryAssertion],
                 user_consent: bool = True):
        self.patterns = patterns
        self.reflections = reflections
        self.assertions = existing_assertions
        self.user_consent = user_consent
    
    def evaluate_patterns(self, user_id: str) -> List[MemoryAssertion]:
        """
        Evaluate patterns for a specific user and create assertions.
        
        Gate Requirements (ALL must be true):
        - pattern_candidate exists
        - occurrence_count >= 3
        - pattern persisted >= 30 days
        - reflection was emitted
        - reflection was NOT dismissed
        - user_memory_consent == True
        """
        if not self.user_consent:
            return []
        
        new_assertions = []
        
        # Filter patterns for this user that meet age and occurrence criteria
        mature_patterns = [
            p for p in self.patterns
            if p.user_id == user_id
            and p.occurrence_count >= 3
            and p.age_days >= 30.0
        ]
        
        for pattern in mature_patterns:
            # Check if reflection was emitted (not dismissed)
            reflection = self._find_reflection_for_pattern(pattern.id)
            
            if not reflection:
                continue
                
            if reflection.dismissed:
                continue
            
            # Check if assertion already exists for this pattern
            if self._assertion_exists(pattern.id):
                # Reinforce existing assertion
                self._reinforce_assertion(pattern.id)
                continue
            
            # Create new assertion
            assertion = self._create_assertion(user_id, pattern, reflection)
            if assertion:
                new_assertions.append(assertion)
        
        return new_assertions
    
    def _find_reflection_for_pattern(self, pattern_id: str) -> Optional[Reflection]:
        """Find reflection linked to this pattern."""
        for r in self.reflections:
            if r.pattern_candidate_id == pattern_id:
                return r
        return None
    
    def _assertion_exists(self, pattern_id: str) -> bool:
        """Check if assertion already exists for this pattern."""
        for a in self.assertions:
            if pattern_id in a.source_pattern_ids:
                return True
        return False
    
    def _reinforce_assertion(self, pattern_id: str):
        """Update last_reinforced_at for existing assertion."""
        for a in self.assertions:
            if pattern_id in a.source_pattern_ids:
                a.last_reinforced_at = datetime.now(timezone.utc)
    
    def _create_assertion(self, 
                         user_id: str, 
                         pattern: PatternCandidate, 
                         reflection: Reflection) -> Optional[MemoryAssertion]:
        """
        Create assertion text using strict template.
        
        Template: "[Interaction pattern] has preceded [outcome tag] in prior sessions."
        """
        # Parse interaction sequence
        interaction = pattern.interaction_sequence.replace('_', ' ').replace('->', 'then')
        outcome = pattern.outcome_tag
        
        assertion_text = f"{interaction.capitalize()} has preceded {outcome} outcomes in prior sessions."
        
        # Validate text (ensure no forbidden terms)
        if self._contains_forbidden_terms(assertion_text):
            return None
        
        # Set initial confidence based on occurrence count
        # High occurrence (5+) = medium, otherwise low
        confidence = 'medium' if pattern.occurrence_count >= 5 else 'low'
        
        return MemoryAssertion(
            user_id=user_id,
            assertion_text=assertion_text,
            confidence_level=confidence,
            source_pattern_ids=[pattern.id],
            source_reflection_id=reflection.id
        )
    
    def _contains_forbidden_terms(self, text: str) -> bool:
        """Check for forbidden causality/judgment terms."""
        forbidden = [
            'led to', 'caused', 'resulted in',
            'should', 'could', 'might',
            'better', 'worse', 'good', 'bad',
            'always', 'never'
        ]
        text_lower = text.lower()
        return any(term in text_lower for term in forbidden)
    
    def check_contradictions(self, user_id: str):
        """
        Detect contradicting assertions and reduce confidence.
        
        Contradiction: Same interaction with different outcomes.
        Response: Lower confidence of both, don't delete.
        """
        # Group by interaction pattern
        pattern_groups: Dict[str, List[MemoryAssertion]] = {}
        for assertion in self.assertions:
            if assertion.user_id != user_id:
                continue
                
            # Extract interaction part (before "has preceded")
            parts = assertion.assertion_text.split(' has preceded ')
            if len(parts) == 2:
                interaction = parts[0].lower()
                if interaction not in pattern_groups:
                    pattern_groups[interaction] = []
                pattern_groups[interaction].append(assertion)
        
        # Check for contradictions within groups
        for interaction, assertions_list in pattern_groups.items():
            if len(assertions_list) > 1:
                # Multiple outcomes for same interaction = contradiction
                # Lower confidence for ALL assertions in this group
                for assertion in assertions_list:
                    if assertion.confidence_level == 'medium':
                        assertion.confidence_level = 'low'
                    # Already low stays low
    
    def apply_decay(self, user_id: str) -> List[str]:
        """
        Apply 60-day decay logic to assertions.
        
        Returns: List of assertion_ids that were deleted.
        """
        deleted_ids = []
        
        for assertion in self.assertions:
            if assertion.user_id != user_id:
                continue
            
            if assertion.days_since_reinforcement >= 60.0:
                if assertion.confidence_level == 'medium':
                    # Downgrade to low
                    assertion.confidence_level = 'low'
                elif assertion.confidence_level == 'low':
                    # Delete
                    deleted_ids.append(assertion.assertion_id)
        
        # Remove deleted assertions
        self.assertions = [
            a for a in self.assertions 
            if a.assertion_id not in deleted_ids
        ]
        
        return deleted_ids
    
    def get_memory_state(self, user_id: str) -> UserMemoryState:
        """
        Calculate memory state for user.
        
        States:
        - insufficient_data: < 2 assertions
        - stable: No contradictions detected
        - unstable: Contradictions exist
        """
        user_assertions = [a for a in self.assertions if a.user_id == user_id]
        
        if len(user_assertions) < 2:
            state = 'insufficient_data'
        else:
            # Check for contradictions (multiple outcomes for same interaction)
            has_contradiction = self._detect_contradiction_state(user_id)
            state = 'unstable' if has_contradiction else 'stable'
        
        return UserMemoryState(
            user_id=user_id,
            memory_state=state,
            assertion_count=len(user_assertions)
        )
    
    def _detect_contradiction_state(self, user_id: str) -> bool:
        """Check if contradictions exist for this user."""
        user_assertions = [a for a in self.assertions if a.user_id == user_id]
        
        # Group by interaction
        interactions: Dict[str, set] = {}
        for assertion in user_assertions:
            parts = assertion.assertion_text.split(' has preceded ')
            if len(parts) == 2:
                interaction = parts[0].lower()
                outcome_part = parts[1]
                # Extract outcome word
                outcome = outcome_part.split()[0]
                
                if interaction not in interactions:
                    interactions[interaction] = set()
                interactions[interaction].add(outcome)
        
        # If any interaction has multiple outcomes, it's a contradiction
        for outcomes in interactions.values():
            if len(outcomes) > 1:
                return True
        
        return False