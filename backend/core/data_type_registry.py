"""
Unified Data Type Registry for ACE V4

This module is the SINGLE SOURCE OF TRUTH for:
- All supported data types
- Domain constraints and reasoning boundaries
- Agent allowlists
- Type detection signals

All other modules (data_typing.py, data_guardrails.py) should import from here.
"""

from __future__ import annotations
from typing import Dict, List, Set, Any
from dataclasses import dataclass, field


@dataclass
class DataTypeConfig:
    """Configuration for a single data type."""
    name: str
    display_name: str
    description: str

    # Detection signals
    column_signals: List[str] = field(default_factory=list)
    value_signals: List[str] = field(default_factory=list)

    # Domain constraints for reasoning
    can_suggest: str = "General patterns and observations"
    cannot_suggest: str = "Domain-specific conclusions without validation"
    requires: str = "Explicit uncertainty labeling"

    # Allowed agents (empty = all agents allowed)
    allowed_agents: Set[str] = field(default_factory=set)

    # Blocked agents (takes precedence over allowed)
    blocked_agents: Set[str] = field(default_factory=set)


# =============================================================================
# CORE DATA TYPES - The canonical list of all supported types
# =============================================================================

DATA_TYPES: Dict[str, DataTypeConfig] = {
    # ----- Business & Marketing -----
    "marketing_performance": DataTypeConfig(
        name="marketing_performance",
        display_name="Marketing Performance",
        description="Marketing campaign metrics, ROI, conversion data",
        column_signals=["campaign", "conversion", "ctr", "click", "impression", "roi", "spend", "ad_"],
        value_signals=["campaign", "facebook", "google", "email", "social"],
        can_suggest="Directional movement and performance trends",
        cannot_suggest="Causality without experimental design",
        requires="Time dimension for trend analysis",
    ),

    "customer_crm": DataTypeConfig(
        name="customer_crm",
        display_name="Customer CRM",
        description="Customer relationship management, churn, retention data",
        column_signals=[
            "customer_id", "customerid", "client_id", "clientid", "churn", "churned",
            "tenure", "loyalty", "loyalty_score", "customer_segment", "credit_score",
            "creditscore", "account_balance", "subscription", "contract",
            "monthly_charges", "total_charges", "exited", "attrition"
        ],
        value_signals=["gold", "platinum", "premium", "basic", "churned", "retained"],
        can_suggest="Churn risk factors and retention opportunities",
        cannot_suggest="Guaranteed customer behavior predictions",
        requires="Customer lifecycle context and historical patterns",
    ),

    "customer_behavior": DataTypeConfig(
        name="customer_behavior",
        display_name="Customer Behavior",
        description="Customer actions, preferences, engagement patterns",
        column_signals=["purchase", "cart", "browse", "visit", "session", "engagement"],
        value_signals=["active", "inactive", "engaged", "dormant"],
        can_suggest="Behavioral patterns and preferences",
        cannot_suggest="Individual-level predictions without consent context",
        requires="Temporal context for behavioral analysis",
    ),

    # ----- Financial -----
    "financial_accounting": DataTypeConfig(
        name="financial_accounting",
        display_name="Financial/Accounting",
        description="Financial statements, transactions, accounting data",
        column_signals=["revenue", "expense", "profit", "loss", "balance", "debit", "credit", "gl_"],
        value_signals=["asset", "liability", "equity"],
        can_suggest="Financial trends and ratio analysis",
        cannot_suggest="Investment advice or audit conclusions",
        requires="Proper accounting context and period alignment",
    ),

    "insurance": DataTypeConfig(
        name="insurance",
        display_name="Insurance",
        description="Insurance claims, policies, risk assessment",
        column_signals=[
            "claim", "policy", "premium", "coverage", "deductible", "insured",
            "beneficiary", "underwriting", "actuarial", "loss_ratio"
        ],
        value_signals=["approved", "denied", "pending", "settled"],
        can_suggest="Risk patterns and claims analysis",
        cannot_suggest="Individual underwriting decisions",
        requires="Actuarial validation and regulatory compliance",
    ),

    # ----- Operations -----
    "operational_supply_chain": DataTypeConfig(
        name="operational_supply_chain",
        display_name="Operations/Supply Chain",
        description="Inventory, logistics, supply chain metrics",
        column_signals=["inventory", "stock", "sku", "warehouse", "shipment", "delivery", "lead_time"],
        value_signals=["in_stock", "out_of_stock", "backorder"],
        can_suggest="Operational efficiency patterns",
        cannot_suggest="Demand forecasts without proper modeling",
        requires="Supply chain context and seasonality awareness",
    ),

    # ----- Technical -----
    "technical_metrics": DataTypeConfig(
        name="technical_metrics",
        display_name="Technical Metrics",
        description="System performance, engineering metrics, DevOps data",
        column_signals=["latency", "throughput", "cpu", "memory", "error_rate", "uptime", "response_time"],
        value_signals=["critical", "warning", "healthy", "degraded"],
        can_suggest="Performance patterns and anomalies",
        cannot_suggest="Root cause without system context",
        requires="Baseline performance context",
    ),

    # ----- Time Series -----
    "time_series_trends": DataTypeConfig(
        name="time_series_trends",
        display_name="Time Series/Trends",
        description="Temporal data with trends and seasonality",
        column_signals=["date", "timestamp", "time", "period", "quarter", "month", "year", "week"],
        value_signals=[],
        can_suggest="Directional trends and patterns",
        cannot_suggest="Causality without additional context",
        requires="Adequate time span for trend detection",
    ),

    "forecast_prediction": DataTypeConfig(
        name="forecast_prediction",
        display_name="Forecast/Prediction",
        description="Forecasting and predictive modeling data",
        column_signals=["forecast", "prediction", "projected", "estimated", "target"],
        value_signals=[],
        can_suggest="Projections with confidence intervals",
        cannot_suggest="Certain future outcomes",
        requires="Confidence levels and assumption disclosure",
    ),

    # ----- Analytics -----
    "correlation_outputs": DataTypeConfig(
        name="correlation_outputs",
        display_name="Correlation Analysis",
        description="Statistical correlation and relationship data",
        column_signals=["correlation", "coefficient", "r_squared", "p_value", "significance"],
        value_signals=[],
        can_suggest="Relationships and associations",
        cannot_suggest="Causal decisions or interventions",
        requires="Multiple variables for correlation analysis",
    ),

    # ----- Research -----
    "experimental_ab_test": DataTypeConfig(
        name="experimental_ab_test",
        display_name="A/B Test/Experimental",
        description="Controlled experiments, A/B tests, clinical trials",
        column_signals=["control", "treatment", "variant", "experiment", "test_group", "ab_"],
        value_signals=["control", "treatment", "variant_a", "variant_b"],
        can_suggest="Causal effects of treatments",
        cannot_suggest="Generalizations beyond experimental conditions",
        requires="Control and treatment groups",
    ),

    "survey_qualitative": DataTypeConfig(
        name="survey_qualitative",
        display_name="Survey/Qualitative",
        description="Survey responses, qualitative feedback, NPS",
        column_signals=["response", "survey", "feedback", "rating", "nps", "satisfaction", "likert"],
        value_signals=["strongly_agree", "agree", "neutral", "disagree", "strongly_disagree"],
        can_suggest="Sentiment patterns and response distributions",
        cannot_suggest="Population-level conclusions without proper sampling",
        requires="Sample representativeness context",
    ),

    # ----- Domain-Specific -----
    "healthcare": DataTypeConfig(
        name="healthcare",
        display_name="Healthcare",
        description="Medical records, patient outcomes, clinical data",
        column_signals=[
            "patient", "diagnosis", "treatment", "medication", "symptom", "vitals",
            "blood_pressure", "heart_rate", "bmi", "lab_result", "icd", "cpt"
        ],
        value_signals=["positive", "negative", "normal", "abnormal", "critical"],
        can_suggest="Statistical patterns and risk factors",
        cannot_suggest="Medical diagnoses or treatment recommendations",
        requires="Clinical validation and regulatory compliance",
    ),

    "real_estate": DataTypeConfig(
        name="real_estate",
        display_name="Real Estate",
        description="Property data, housing prices, real estate transactions",
        column_signals=[
            "price", "sqft", "square_feet", "bedroom", "bathroom", "property",
            "listing", "appraisal", "mortgage", "zillow", "address", "lot_size"
        ],
        value_signals=["single_family", "condo", "townhouse", "multi_family"],
        can_suggest="Market trends and property valuations",
        cannot_suggest="Investment guarantees or definitive appraisals",
        requires="Local market context and temporal considerations",
    ),

    "hr_employee": DataTypeConfig(
        name="hr_employee",
        display_name="HR/Employee",
        description="Human resources, employee data, workforce analytics",
        column_signals=[
            "employee", "emp_id", "department", "salary", "hire_date", "termination",
            "performance", "tenure", "job_title", "manager", "attrition", "overtime"
        ],
        value_signals=["full_time", "part_time", "contractor", "terminated", "active"],
        can_suggest="Workforce patterns and retention indicators",
        cannot_suggest="Individual performance predictions or hiring decisions",
        requires="Privacy compliance and aggregate-level insights",
    ),

    "education": DataTypeConfig(
        name="education",
        display_name="Education",
        description="Student performance, academic records, educational outcomes",
        column_signals=[
            "student", "grade", "gpa", "score", "exam", "course", "enrollment",
            "attendance", "graduation", "major", "credits", "semester"
        ],
        value_signals=["pass", "fail", "incomplete", "withdrawn"],
        can_suggest="Learning patterns and performance indicators",
        cannot_suggest="Student capability assessments or admissions decisions",
        requires="Privacy compliance and educational context",
    ),

    # ----- Sensitive/Special -----
    "political_policy": DataTypeConfig(
        name="political_policy",
        display_name="Political/Policy",
        description="Political data, policy analysis, government records",
        column_signals=["vote", "party", "election", "policy", "legislation", "district"],
        value_signals=["democrat", "republican", "independent"],
        can_suggest="Patterns and trends with source sensitivity",
        cannot_suggest="Causal policy effects without experimental data",
        requires="Uncertainty labeling and source attribution",
    ),

    "risk_compliance": DataTypeConfig(
        name="risk_compliance",
        display_name="Risk/Compliance",
        description="Risk assessment, compliance monitoring, audit data",
        column_signals=["risk", "compliance", "audit", "violation", "regulatory", "aml", "kyc"],
        value_signals=["compliant", "non_compliant", "high_risk", "low_risk"],
        can_suggest="Risk patterns and compliance status",
        cannot_suggest="Legal conclusions or enforcement recommendations",
        requires="Regulatory context and audit trail",
    ),

    "geospatial": DataTypeConfig(
        name="geospatial",
        display_name="Geospatial",
        description="Geographic, location-based, mapping data",
        column_signals=["latitude", "longitude", "lat", "lng", "geo", "location", "coordinates", "zip"],
        value_signals=[],
        can_suggest="Geographic patterns and distributions",
        cannot_suggest="Location-based predictions without context",
        requires="Spatial context and scale awareness",
    ),

    "text_narrative": DataTypeConfig(
        name="text_narrative",
        display_name="Text/Narrative",
        description="Unstructured text, documents, narrative content",
        column_signals=["text", "content", "body", "description", "comment", "review", "narrative"],
        value_signals=[],
        can_suggest="Themes and sentiment patterns",
        cannot_suggest="Definitive intent or meaning attribution",
        requires="Context for text interpretation",
    ),

    # ----- Catch-all -----
    "mixed": DataTypeConfig(
        name="mixed",
        display_name="Mixed",
        description="Multiple data types or unclear classification",
        can_suggest="General patterns and observations",
        cannot_suggest="Domain-specific conclusions",
        requires="Explicit uncertainty labeling",
    ),

    "unknown": DataTypeConfig(
        name="unknown",
        display_name="Unknown",
        description="Unable to classify data type",
        can_suggest="General patterns only",
        cannot_suggest="Any domain-specific conclusions",
        requires="Maximum uncertainty labeling",
    ),
}


# =============================================================================
# AGENT CONFIGURATION
# =============================================================================

# All possible agents in the pipeline
ALL_AGENTS = {
    "type_identifier", "scanner", "interpreter", "validator",
    "overseer", "regression", "sentry", "personas", "fabricator",
    "expositor", "trust_evaluation"
}

# Agents that run for ALL data types (foundational agents)
UNIVERSAL_AGENTS = {
    "type_identifier", "scanner", "interpreter", "validator",
    "sentry", "expositor", "trust_evaluation"
}

# Agents with restricted data type support
RESTRICTED_AGENTS: Dict[str, Set[str]] = {
    "overseer": {
        "marketing_performance", "customer_behavior", "customer_crm",
        "operational_supply_chain", "time_series_trends", "forecast_prediction",
        "financial_accounting", "technical_metrics", "correlation_outputs",
        "healthcare", "real_estate", "hr_employee", "insurance", "education",
    },
    "regression": {
        "marketing_performance", "customer_behavior", "customer_crm",
        "operational_supply_chain", "time_series_trends", "financial_accounting",
        "technical_metrics", "forecast_prediction",
        "healthcare", "real_estate", "hr_employee", "insurance", "education",
    },
    "personas": {
        "marketing_performance", "customer_behavior", "customer_crm",
        "survey_qualitative", "operational_supply_chain",
        "healthcare", "hr_employee", "education",
        "mixed",
    },
    "fabricator": {
        "marketing_performance", "customer_behavior", "customer_crm",
        "operational_supply_chain", "financial_accounting",
        "real_estate", "insurance",
    },
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_supported_types() -> List[str]:
    """Get list of all supported data type names."""
    return list(DATA_TYPES.keys())


def get_type_config(type_name: str) -> DataTypeConfig:
    """Get configuration for a specific data type."""
    return DATA_TYPES.get(type_name, DATA_TYPES["unknown"])


def get_domain_constraints(type_name: str) -> Dict[str, str]:
    """Get domain reasoning constraints for a data type."""
    config = get_type_config(type_name)
    return {
        "can_suggest": config.can_suggest,
        "cannot_suggest": config.cannot_suggest,
        "requires": config.requires,
    }


def is_agent_allowed_for_type(agent: str, data_type: str) -> tuple[bool, str]:
    """
    Check if an agent is allowed to run for a given data type.

    Returns:
        (allowed: bool, reason: str)
    """
    # Universal agents always allowed
    if agent in UNIVERSAL_AGENTS:
        return True, ""

    # Check if agent has restrictions
    if agent in RESTRICTED_AGENTS:
        allowed_types = RESTRICTED_AGENTS[agent]
        if data_type in allowed_types:
            return True, ""
        else:
            return False, f"Agent '{agent}' not supported for data type '{data_type}'"

    # Unknown agent - allow by default
    return True, ""


def get_detection_signals(type_name: str) -> Dict[str, List[str]]:
    """Get column and value signals for detecting a data type."""
    config = get_type_config(type_name)
    return {
        "columns": config.column_signals,
        "values": config.value_signals,
    }


def get_all_detection_catalogs() -> Dict[str, Dict[str, List[str]]]:
    """Get all detection signals organized by type for data_typing.py."""
    return {
        name: {
            "columns": config.column_signals,
            "values": config.value_signals,
        }
        for name, config in DATA_TYPES.items()
        if config.column_signals or config.value_signals
    }


# =============================================================================
# BACKWARDS COMPATIBILITY EXPORTS
# =============================================================================

# For data_guardrails.py compatibility
SUPPORTED_DATA_TYPES = get_supported_types()

DOMAIN_CONSTRAINTS = {
    name: get_domain_constraints(name)
    for name in DATA_TYPES.keys()
}

AGENT_ALLOWLIST = {
    agent: list(types)
    for agent, types in RESTRICTED_AGENTS.items()
}
# Add universal agents
for agent in UNIVERSAL_AGENTS:
    AGENT_ALLOWLIST[agent] = SUPPORTED_DATA_TYPES.copy()
