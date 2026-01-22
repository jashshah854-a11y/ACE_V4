"""
Phase 5.3: Automated Reflection Pipeline.

Detailed Logic:
1. Pattern Intake: Must be valid PatternCandidate (N>=3, Age>=7 days).
2. Eligibility: No recent reflections (14 days), consent given.
3. Grammar: "Previously, [X] was followed by [Y]."
4. Tone Gate: No forbidden words.
"""

from typing import List, Optional
from datetime import datetime, timedelta
import uuid
from backend.api.decision_models import PatternCandidate, Reflection

class ToneValidator:
    """The 'Iron Dome' for reflection language."""
    
    FORBIDDEN_TERMS = {
        "should", "could", "might", "ought",
        "often", "usually", "generally", "typically",
        "led to", "resulted in", "caused",
        "improved", "worse", "better", "good", "bad",
        "mistake", "error", "correct", "wrong",
        "suggest", "recommend"
    }

    @classmethod
    def validate(cls, text: str) -> bool:
        """Return True if text passes the tone gate (contains no forbidden terms)."""
        lower_text = text.lower()
        for term in cls.FORBIDDEN_TERMS:
            # Simple substring check is robust enough for this strict allowlist approach
            # actually we might want word boundary checks, but for now strict is safer.
            if f" {term} " in f" {lower_text} ": # Wrap in spaces to match whole words roughly
                return False
            # Check for sentence starts/ends
            if lower_text.startswith(f"{term} ") or lower_text.endswith(f" {term}"):
                return False
        return True


class ReflectionGenerator:
    """
    Converts PatternCandidates into Reflections.
    Strictly deterministic. No AI/LLM generation.
    
    Phase 6.0 Safety: Uses SafetyGuard for consent and gate enforcement.
    """
    
    def __init__(self, 
                 patterns: List[PatternCandidate], 
                 existing_reflections: List[Reflection],
                 safety_guard=None,
                 circuit_breaker=None):
        self.patterns = patterns
        self.history = existing_reflections
        self.safety_guard = safety_guard
        self.circuit_breaker = circuit_breaker
        self.new_reflections: List[Reflection] = []

    def _get_user_history(self, user_id: str) -> List[Reflection]:
        return [r for r in self.history if r.run_id # Oh wait run_id is not user_id. 
                # Reflection schema doesn't have user_id stored directly?
                # It links to pattern_candidate within logic, but for simple history check
                # we assume we pass in only relevant history or we need user_id on Reflection.
                # Actually Reflection doesn't have user_id in the model I just updated. 
                # It triggers per 'run'.
                # But 'PatternCandidate' has user_id.
                # 'Reflection' target is a 'run_id' (Report).
                # The pipeline connects User -> Pattern -> Reflection -> Run.
                # We need to filter history by the User correlated to the Run?
                # For Phase 5, we assume Run is associated with a User Session.
                # Patterns are User-scoped. Reflections are Run-scoped.
                # 
                # We will filter history based on the patterns linked to them.
                # Or assume the caller provides history for the specific user context.
                # 
                # Let's assume input `existing_reflections` is for the TARGET USER.
                ]
        pass # Logic handled in process()

    def _is_cooldown_active(self, user_max_date: Optional[datetime]) -> bool:
        if not user_max_date:
            return False
        # 14 days cooldown rule
        delta = datetime.utcnow() - user_max_date
        return delta.days < 14

    def generate(self, target_run_id: str, target_user_id: str) -> Optional[Reflection]:
        """
        Run the pipeline for a specific user/run context.
        Returns a single Reflection or None.
        """
        # Safety Guard: Check reflection generation permission
        if self.safety_guard:
            # First, find the oldest valid pattern for age check
            valid_patterns_for_check = [
                p for p in self.patterns 
                if p.user_id == target_user_id 
                and p.age_days >= 7.0
                and p.occurrence_count >= 3
            ]
            
            if not valid_patterns_for_check:
                return None
                
            oldest_pattern = max(valid_patterns_for_check, key=lambda x: x.age_days)
            
            decision = self.safety_guard.check_reflection_generation(
                user_id=target_user_id,
                pattern_age_days=oldest_pattern.age_days,
                request_id=target_run_id
            )
            
            if not decision.allow:
                # Blocked by guard (consent, kill switch, cap, etc.)
                return None

        # 1. Filter ineligible patterns (User match, Persistence Gate)
        valid_patterns = [
            p for p in self.patterns 
            if p.user_id == target_user_id 
            and p.age_days >= 7.0
            and p.occurrence_count >= 3
        ]

        if not valid_patterns:
            return None

        # 2. Check Cooldown (Global for User)
        # Find most recent shown reflection for this user
        last_shown = None
        # We assume self.history is filtered for this user or we iterate all
        # To be safe, if history is global, we can't easily filter without user_id on Reflection.
        # But Phase 5 is single-tenant local sim for now (mostly).
        # We'll validly assume self.history contains relevant records.
        
        shown_dates = [r.shown_at for r in self.history if r.shown_at]
        if shown_dates:
            last_shown = max(shown_dates)
            
        if self._is_cooldown_active(last_shown):
            return None

        # 3. Select best candidate (Oldest valid pattern that hasn't been dismissed)
        # We need to know which patterns were dismissed.
        # dismissed_pattern_ids = {r.pattern_candidate_id for r in self.history if r.dismissed}
        # Actually dismissal logic: "If dismissed once, that sentence is never shown."
        # Meaning that pattern is burned.
        
        dismissed_pid = {r.pattern_candidate_id for r in self.history if r.dismissed}
        
        # Sort by age descending (show oldest established pattern first)
        valid_patterns.sort(key=lambda x: x.age_days, reverse=True)
        
        selected_pattern = None
        for p in valid_patterns:
            if p.id not in dismissed_pid:
                selected_pattern = p
                break
        
        if not selected_pattern:
            return None

        # 4. Generate Text (Strict Template)
        # "Previously, [interaction_sequence] was followed by [outcome_tag]."
        # We need to humanize the interaction sequence slightly or keep it raw?
        # User request: "Previously, [interaction sequence] was followed by a [outcome tag]."
        # Example: "trust_inspect -> no_action"
        # We should map likely technical keys to readable text? 
        # Or just replace `_` with spaces.
        
        seq_text = selected_pattern.interaction_sequence.replace('_', ' ').replace('->', 'then')
        outcome_text = selected_pattern.outcome_tag
        
        text = f"Previously, {seq_text} was followed by a {outcome_text} outcome."
        
        # 5. Validate Tone
        if not ToneValidator.validate(text):
            # Log silent failure
            return None

        # 6. Create Reflection
        reflection = Reflection(
            run_id=target_run_id,
            pattern_candidate_id=selected_pattern.id,
            reflection_text=text,
            display_location='reflection_slot',
            dismissed=False
        )
        
        # Record in circuit breaker
        if self.circuit_breaker:
            self.circuit_breaker.record_reflection(target_user_id)
        
        return reflection

