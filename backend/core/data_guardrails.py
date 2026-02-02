from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from core.analysis_routing import agent_analysis_map
from core.run_manifest import read_manifest
from core.state_manager import StateManager

SUPPORTED_DATA_TYPES: List[str] = [
    "marketing_performance",
    "technical_metrics",
    "correlation_outputs",
    "time_series_trends",
    "forecast_prediction",
    "political_policy",
    "financial_accounting",
    "customer_behavior",
    "operational_supply_chain",
    "survey_qualitative",
    "geospatial",
    "experimental_ab_test",
    "risk_compliance",
    "text_narrative",
    # New domain types from data_typing.py
    "customer_crm",
    "healthcare",
    "real_estate",
    "hr_employee",
    "insurance",
    "education",
    "mixed",
    "unknown",
]


# Domain-specific reasoning boundaries
DOMAIN_CONSTRAINTS: Dict[str, Dict[str, str]] = {
    "marketing_performance": {
        "can_suggest": "Directional movement and performance trends",
        "cannot_suggest": "Causality without experimental design",
        "requires": "Time dimension for trend analysis",
    },
    "correlation_outputs": {
        "can_suggest": "Relationships and associations",
        "cannot_suggest": "Causal decisions or interventions",
        "requires": "Multiple variables for correlation analysis",
    },
    "political_policy": {
        "can_suggest": "Patterns and trends with source sensitivity",
        "cannot_suggest": "Causal policy effects without experimental data",
        "requires": "Uncertainty labeling and source attribution",
    },
    "forecast_prediction": {
        "can_suggest": "Projections with confidence intervals",
        "cannot_suggest": "Certain future outcomes",
        "requires": "Confidence levels and assumption disclosure",
    },
    "time_series_trends": {
        "can_suggest": "Directional trends and patterns",
        "cannot_suggest": "Causality without additional context",
        "requires": "Adequate time span for trend detection",
    },
    "experimental_ab_test": {
        "can_suggest": "Causal effects of treatments",
        "cannot_suggest": "Generalizations beyond experimental conditions",
        "requires": "Control and treatment groups",
    },
    # New domain types constraints
    "customer_crm": {
        "can_suggest": "Churn risk factors and retention opportunities",
        "cannot_suggest": "Guaranteed customer behavior predictions",
        "requires": "Customer lifecycle context and historical patterns",
    },
    "healthcare": {
        "can_suggest": "Statistical patterns and risk factors",
        "cannot_suggest": "Medical diagnoses or treatment recommendations",
        "requires": "Clinical validation and regulatory compliance",
    },
    "real_estate": {
        "can_suggest": "Market trends and property valuations",
        "cannot_suggest": "Investment guarantees or definitive appraisals",
        "requires": "Local market context and temporal considerations",
    },
    "hr_employee": {
        "can_suggest": "Workforce patterns and retention indicators",
        "cannot_suggest": "Individual performance predictions or hiring decisions",
        "requires": "Privacy compliance and aggregate-level insights",
    },
    "insurance": {
        "can_suggest": "Risk patterns and claims analysis",
        "cannot_suggest": "Individual underwriting decisions",
        "requires": "Actuarial validation and regulatory compliance",
    },
    "education": {
        "can_suggest": "Learning patterns and performance indicators",
        "cannot_suggest": "Student capability assessments or admissions decisions",
        "requires": "Privacy compliance and educational context",
    },
}


AGENT_ALLOWLIST: Dict[str, List[str]] = {
    # foundational
    "type_identifier": SUPPORTED_DATA_TYPES,
    "validator": SUPPORTED_DATA_TYPES,
    "scanner": SUPPORTED_DATA_TYPES,
    "interpreter": SUPPORTED_DATA_TYPES,
    # analytics agents
    "overseer": [
        "marketing_performance",
        "customer_behavior",
        "operational_supply_chain",
        "time_series_trends",
        "forecast_prediction",
        "financial_accounting",
        "technical_metrics",
        "correlation_outputs",
        # New domain types
        "customer_crm",
        "healthcare",
        "real_estate",
        "hr_employee",
        "insurance",
        "education",
    ],
    "regression": [
        "marketing_performance",
        "customer_behavior",
        "operational_supply_chain",
        "time_series_trends",
        "financial_accounting",
        "technical_metrics",
        "forecast_prediction",
        # New domain types - predictive modeling applies to these
        "customer_crm",
        "healthcare",
        "real_estate",
        "hr_employee",
        "insurance",
        "education",
    ],
    "sentry": SUPPORTED_DATA_TYPES,
    "personas": [
        "marketing_performance",
        "customer_behavior",
        "survey_qualitative",
        "operational_supply_chain",
        # New domain types with human segments
        "customer_crm",
        "healthcare",
        "hr_employee",
        "education",
        "mixed",
    ],
    "fabricator": SUPPORTED_DATA_TYPES,
    "expositor": SUPPORTED_DATA_TYPES,
}


def is_agent_allowed(agent: str, data_type: Optional[str]) -> Tuple[bool, str]:
    """
    Decide if an agent may run on the detected data type.
    Unknown or mixed types are allowed but flagged so that downstream content
    can express uncertainty.
    """
    if agent not in AGENT_ALLOWLIST:
        return True, ""

    if data_type in (None, "unknown"):
        return True, "Data type unknown; allow but require uncertainty messaging."
    if data_type == "mixed":
        return True, "Mixed data type; proceed with caution."

    if data_type in AGENT_ALLOWLIST[agent]:
        return True, ""

    return False, f"Agent '{agent}' not allowed for data type '{data_type}'."


def is_agent_allowed_for_run(agent: str, state_manager: StateManager, data_type: Optional[str]) -> Tuple[bool, str]:
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
    if not data_type or data_type not in DOMAIN_CONSTRAINTS:
        return {
            "can_suggest": "General patterns and observations",
            "cannot_suggest": "Domain-specific conclusions without validation",
            "requires": "Explicit uncertainty labeling",
        }
    return DOMAIN_CONSTRAINTS[data_type]


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
) -> Dict[str, any]:
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

