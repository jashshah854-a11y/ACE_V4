"""
Data Guardrails for ACE V4

This module provides data type validation and agent allowlist checks.
All data type definitions are imported from the unified data_type_registry.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple, Any

from core.analysis_routing import agent_analysis_map
from core.run_manifest import read_manifest
from core.state_manager import StateManager

# Import from the unified registry - SINGLE SOURCE OF TRUTH
from core.data_type_registry import (
    SUPPORTED_DATA_TYPES,
    DOMAIN_CONSTRAINTS,
    AGENT_ALLOWLIST,
    get_domain_constraints as _get_domain_constraints,
    is_agent_allowed_for_type,
    UNIVERSAL_AGENTS,
)


def is_agent_allowed(agent: str, data_type: Optional[str]) -> Tuple[bool, str]:
    """
    Decide if an agent may run on the detected data type.

    Universal agents (expositor, sentry, etc.) are ALWAYS allowed.
    Unknown or mixed types are allowed but flagged for uncertainty messaging.
    """
    # Universal agents always run - especially expositor for report generation
    if agent in UNIVERSAL_AGENTS:
        if data_type in (None, "unknown"):
            return True, "Data type unknown; proceeding with uncertainty messaging."
        if data_type == "mixed":
            return True, "Mixed data type; proceeding with caution."
        return True, ""

    # Check restricted agents against allowlist
    if agent in AGENT_ALLOWLIST:
        if data_type in (None, "unknown"):
            return True, "Data type unknown; allow but require uncertainty messaging."
        if data_type == "mixed":
            return True, "Mixed data type; proceed with caution."

        if data_type in AGENT_ALLOWLIST[agent]:
            return True, ""

        return False, f"Agent '{agent}' not allowed for data type '{data_type}'."

    # Unknown agent - allow by default
    return True, ""


def is_agent_allowed_for_run(agent: str, state_manager: StateManager, data_type: Optional[str]) -> Tuple[bool, str]:
    """
    Check if an agent is allowed for a specific run, considering both
    data type and task contract routing.
    """
    manifest = read_manifest(state_manager.run_path) or {}
    allowed = set(manifest.get("analysis_allowed") or [])
    suppressed = manifest.get("analysis_suppressed") or {}
    analysis = agent_analysis_map(agent)

    if analysis and allowed and analysis not in allowed:
        reason = suppressed.get(analysis, f"{analysis} suppressed by routing.")
        return False, reason

    return is_agent_allowed(agent, data_type)


def get_domain_constraints(data_type: Optional[str]) -> Dict[str, str]:
    """Get domain-specific reasoning constraints."""
    if not data_type:
        return {
            "can_suggest": "General patterns and observations",
            "cannot_suggest": "Domain-specific conclusions without validation",
            "requires": "Explicit uncertainty labeling",
        }
    return _get_domain_constraints(data_type)


def calculate_confidence_level(
    data_completeness: float,
    method_robustness: str,
    consistency_score: float
) -> str:
    """
    Calculate confidence level based on data quality metrics.
    Returns: 'high', 'moderate', or 'exploratory'
    """
    # Data completeness weight: 40%
    completeness_score = data_completeness * 0.4

    # Method robustness weight: 30%
    robustness_map = {"high": 1.0, "moderate": 0.6, "low": 0.3}
    robustness_score = robustness_map.get(method_robustness, 0.3) * 0.3

    # Consistency weight: 30%
    consistency_weighted = consistency_score * 0.3

    total_score = completeness_score + robustness_score + consistency_weighted

    if total_score >= 0.7:
        return "high"
    elif total_score >= 0.4:
        return "moderate"
    else:
        return "exploratory"


def label_confidence(
    insight: str,
    data_completeness: float,
    method_robustness: str = "moderate",
    consistency_score: float = 0.5
) -> Dict[str, Any]:
    """
    Label an insight with confidence metadata.
    Returns insight with confidence label and reasoning.
    """
    confidence = calculate_confidence_level(data_completeness, method_robustness, consistency_score)

    return {
        "insight": insight,
        "confidence": confidence,
        "confidence_reasoning": {
            "data_completeness": data_completeness,
            "method_robustness": method_robustness,
            "consistency_score": consistency_score,
        },
        "language": {
            "high": "High confidence",
            "moderate": "Moderate confidence",
            "exploratory": "Exploratory only - requires validation",
        }.get(confidence, "Unknown confidence"),
    }


def append_limitation(state_manager, message: str, agent: Optional[str] = None, severity: str = "warning"):
    """
    Store limitation/constraint notes so report builders can surface them.
    """
    existing = state_manager.read("limitations") or []
    existing.append(
        {
            "agent": agent,
            "message": message,
            "severity": severity,
        }
    )
    state_manager.write("limitations", existing)


def check_validation_passed(state_manager) -> Tuple[bool, Optional[str]]:
    """
    Check if data validation passed before allowing insight generation.
    Returns (can_proceed, reason_if_blocked)
    """
    validation_report = state_manager.read("validation_report")

    if not validation_report:
        return True, None  # No validation yet, allow

    if validation_report.get("error"):
        return False, "Data validation failed due to error"

    if not validation_report.get("can_proceed", True):
        return False, "Data sufficiency checks failed"

    if validation_report.get("mode") == "limitations":
        return False, "Dataset in limitation mode - cannot generate insights"

    return True, None
