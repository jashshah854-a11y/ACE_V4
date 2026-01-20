"""
Decision capture models for Phase 5 system intelligence.

Tracks executive interactions with Action Items, evidence, and trust signals
to enable contextual memory and reflective feedback.
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


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
    timestamp: datetime = Field(default_factory=datetime.utcnow)


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
    marked_at: datetime = Field(default_factory=datetime.utcnow)


class Reflection(BaseModel):
    """Generated reflection based on prior decision patterns."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    run_id: str = Field(..., description="Run this reflection is for")
    reflection_text: str = Field(..., max_length=280, description="One-sentence reflection")
    based_on_touches: list[str] = Field(default_factory=list, description="Decision touch IDs")
    display_location: Literal['governing_thought', 'action_items', 'validation'] = Field(
        ..., 
        description="Where to display the reflection"
    )
    dismissed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


import uuid
