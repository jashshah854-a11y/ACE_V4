"""
Decision capture models for Phase 5 system intelligence.

Tracks executive interactions with Action Items, evidence, and trust signals
to enable contextual memory and reflective feedback.
"""

from datetime import datetime, timezone
from typing import Optional, Literal
from pydantic import BaseModel, Field
import uuid


class DecisionTouchCreate(BaseModel):
    """Request model for creating a decision touch record."""
    run_id: str = Field(..., description="UUID of the analysis run")
    user_id: Optional[str] = Field(None, description="User identifier if available")
    session_id: str = Field(..., description="Browser session identifier")
    touch_type: Literal[
        'action_view', 
        'action_click', 
        'evidence_expand', 
        'trust_inspect',
        'reflection_dismiss'
    ] = Field(..., description="Type of interaction")
    target_id: str = Field(..., description="ID of the interacted element")
    context: dict = Field(
        default_factory=dict,
        description="Additional context (narrative_mode, scroll_depth, time_on_page)"
    )


class DecisionTouch(DecisionTouchCreate):
    """Complete decision touch record with timestamp."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ActionOutcomeCreate(BaseModel):
    """Request model for tagging action outcomes."""
    decision_touch_id: str = Field(..., description="ID of the original decision touch")
    run_id: str = Field(..., description="Report this outcome belongs to")
    action_item_id: Optional[str] = Field(None, description="ID of the action item if applicable")
    status: Literal['positive', 'neutral', 'negative', 'unknown'] = Field(
        ..., 
        description="Outcome status - LOCKED to 4 values only"
    )
    notes: Optional[str] = Field(None, max_length=280, description="Optional notes")


class ActionOutcome(ActionOutcomeCreate):
    """Complete action outcome record with metadata."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    marked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Reflection(BaseModel):
    """Generated reflection based on prior decision patterns."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    run_id: str = Field(..., description="Report run this reflection is targeting")
    pattern_candidate_id: str = Field(..., description="Source pattern ID")
    reflection_text: str = Field(..., max_length=280, description="Strictly generated observation")
    display_location: Literal['reflection_slot'] = Field(
        default='reflection_slot', 
        description="Dedicated UI slot only"
    )
    dismissed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    shown_at: Optional[datetime] = Field(None, description="Timestamp when successfully rendered to user")


class PatternCandidate(BaseModel):
    """
    Phase 5.25: Internal record of detected behavioral repetition.
    Pure fact storage. No interpretation.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(..., description="User exhibiting the pattern")
    interaction_sequence: str = Field(..., description="Arrow-separated sequence e.g. trust_inspect -> no_action")
    outcome_tag: Literal['positive', 'neutral', 'negative', 'unknown'] = Field(..., description="Associated outcome")
    occurrence_count: int = Field(..., description="Number of times observed")
    first_seen_at: datetime = Field(..., description="First occurrence timestamp")
    last_seen_at: datetime = Field(..., description="Most recent occurrence timestamp")
    
    @property
    def age_days(self) -> float:
        """Calculate persistence duration in days."""
        return (self.last_seen_at - self.first_seen_at).total_seconds() / 86400


class MemoryAssertion(BaseModel):
    """
    Memory Assertion Engine: Soft internal beliefs formed from mature patterns.
    Never shown to user. Requires 30+ days vs 7 for reflections.
    """
    assertion_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(..., description="User this assertion applies to")
    assertion_text: str = Field(..., max_length=280, description="Neutral observational belief")
    confidence_level: Literal['low', 'medium'] = Field(..., description="Never 'high' - uncertainty required")
    source_pattern_ids: list[str] = Field(..., description="PatternCandidate IDs that formed this assertion")
    source_reflection_id: Optional[str] = Field(None, description="Reflection that preceded this assertion")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_reinforced_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    @property
    def days_since_reinforcement(self) -> float:
        """Calculate days since last reinforcement."""
        delta = datetime.now(timezone.utc) - self.last_reinforced_at
        return delta.total_seconds() / 86400


class UserMemoryState(BaseModel):
    """
    Internal state tracking memory coherence per user.
    Purely internal. Never exposed.
    """
    user_id: str = Field(..., description="User this state applies to")
    memory_state: Literal['stable', 'unstable', 'insufficient_data'] = Field(
        default='insufficient_data',
        description="Internal coherence assessment"
    )
    assertion_count: int = Field(default=0, description="Number of active assertions")
    last_evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReconciliationNote(BaseModel):
    """
    Phase 6: Internal notes explaining why belief confidence changed.
    Purely internal. Never exposed.
    """
    note_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = Field(..., description="User whose beliefs were reconciled")
    assertion_ids: list[str] = Field(..., description="Affected assertion IDs")
    reconciliation_type: Literal['contradiction', 'decay', 'reinforcement', 'new_evidence'] = Field(
        ..., 
        description="Type of reconciliation performed"
    )
    confidence_before: dict[str, str] = Field(..., description="Confidence levels before reconciliation")
    confidence_after: dict[str, str] = Field(..., description="Confidence levels after reconciliation")
    reasoning: str = Field(..., max_length=500, description="Internal explanation of change")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BeliefCoherenceState(BaseModel):
    """
    Phase 6: Tracks overall belief coherence for a user.
    States: stable, unstable, insufficient_data, decaying
    """
    user_id: str = Field(..., description="User this coherence state applies to")
    current_state: Literal['stable', 'unstable', 'insufficient_data', 'decaying', 'suspended'] = Field(
        default='insufficient_data',
        description="Current coherence assessment"
    )
    assertion_count: int = Field(default=0, description="Number of active assertions")
    contradiction_count: int = Field(default=0, description="Number of active contradictions")
    last_reconciliation_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    state_history: list[dict] = Field(
        default_factory=list,
        description="History of state transitions"
    )
