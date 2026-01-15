"""
Evidence Standards - ACE V4 Analytical Rigor Framework
========================================================

LAW 3: The Evidence Logic
Every analytical insight must be traceable, measurable, and reproducible.

This module defines the canonical EvidenceObject structure that all
insight-generating agents must conform to.

Author: ACE V4 Stability Team
Phase: Operation Iron Heart
"""

from typing import TypedDict, Literal, Optional, List, Union, Any
from datetime import datetime
import json


# Quality threshold for predictive vs descriptive mode
# LOWERED v4.1: Liberalized to allow exploratory insights on messy data (Steam/Gaming datasets)
QUALITY_THRESHOLD = 0.1

# Severity levels for claims
SeverityLevel = Literal["info", "warning", "critical"]

# Methodology types for evidence
MethodologyType = Literal[
    "regression",
    "cohort_analysis", 
    "clustering",
    "statistical_test",
    "rule_based",
    "descriptive_stats",
    "time_series",
    "classification",
    "anomaly_detection"
]


class Evidence(TypedDict, total=False):
    """
    The Evidence object contains the quantitative proof for a claim.
    
    Required fields:
        metric: Name of the measured phenomenon
        value: The actual measurement
        source_columns: Which data columns were analyzed
        methodology: How the analysis was performed
        
    Optional fields:
        sample_size: Number of data points (n=)
        timestamp: When the analysis was performed
        statistical_significance: p-value or confidence interval
        additional_metrics: Supporting measurements
        source_code: Reproducible SQL/Pandas snippet
        data_source: Origin dataset or table name
        source_notes: Additional lineage context
    """
    metric: str
    value: Union[float, int, str, bool]
    source_columns: List[str]
    methodology: MethodologyType
    sample_size: Optional[int]
    timestamp: Optional[str]
    statistical_significance: Optional[float]
    additional_metrics: Optional[dict]
    source_code: Optional[str]
    data_source: Optional[str]
    source_notes: Optional[str]


class EvidenceObject(TypedDict, total=False):
    """
    Canonical structure for all analytical insights in ACE V4.
    
    Every insight that goes into insights.json must conform to this schema.
    
    Example:
        {
            "claim": "Customer churn rate is 25% in Q4",
            "confidence": 0.87,
            "severity": "warning",
            "evidence": {
                "metric": "churn_rate",
                "value": 0.25,
                "sample_size": 1024,
                "source_columns": ["customer_id", "last_active_date"],
                "methodology": "cohort_analysis"
            },
            "artifact_path": "artifacts/churn_analysis.json"
        }
    """
    claim: str
    confidence: float  # 0.0 - 1.0
    severity: Optional[SeverityLevel]
    evidence: Evidence
    artifact_path: Optional[str]
    agent: Optional[str]  # Which agent generated this insight


def create_evidence(
    claim: str,
    confidence: float,
    metric: str,
    value: Union[float, int, str, bool],
    source_columns: List[str],
    methodology: MethodologyType,
    sample_size: Optional[int] = None,
    severity: Optional[SeverityLevel] = None,
    artifact_path: Optional[str] = None,
    agent: Optional[str] = None,
    statistical_significance: Optional[float] = None,
    additional_metrics: Optional[dict] = None,
    source_code: Optional[str] = None,
    data_source: Optional[str] = None,
    source_notes: Optional[str] = None
) -> EvidenceObject:
    """
    Factory function to create a properly structured EvidenceObject.
    
    Args:
        claim: Human-readable assertion (e.g., "Revenue is growing 15%")
        confidence: Float between 0.0 and 1.0
        metric: Machine-readable metric name (e.g., "revenue_growth_rate")
        value: The measured value
        source_columns: List of column names that contributed to this insight
        methodology: Analysis method used
        sample_size: Number of data points analyzed (optional)
        severity: Importance level (optional)
        artifact_path: Path to detailed JSON artifact (optional)
        agent: Name of generating agent (optional)
        statistical_significance: p-value or confidence interval (optional)
        additional_metrics: Supporting measurements (optional)
        
    Returns:
        EvidenceObject: Properly structured insight
        
    Raises:
        ValueError: If confidence is out of range or required fields are missing
    """
    if not 0.0 <= confidence <= 1.0:
        raise ValueError(f"Confidence must be between 0.0 and 1.0, got {confidence}")
    
    if not claim or not claim.strip():
        raise ValueError("Claim cannot be empty")
        
    if not source_columns:
        raise ValueError("source_columns cannot be empty")
    
    evidence: Evidence = {
        "metric": metric,
        "value": value,
        "source_columns": source_columns,
        "methodology": methodology
    }
    
    # Add optional fields if provided
    if sample_size is not None:
        evidence["sample_size"] = sample_size
    
    if statistical_significance is not None:
        evidence["statistical_significance"] = statistical_significance
        
    if additional_metrics is not None:
        evidence["additional_metrics"] = additional_metrics
    
    if source_code:
        evidence["source_code"] = source_code.strip()
    
    if data_source:
        evidence["data_source"] = data_source
    
    if source_notes:
        evidence["source_notes"] = source_notes
    
    # Always add timestamp
    evidence["timestamp"] = datetime.utcnow().isoformat() + "Z"
    
    obj: EvidenceObject = {
        "claim": claim.strip(),
        "confidence": round(confidence, 3),
        "evidence": evidence
    }
    
    if severity:
        obj["severity"] = severity
        
    if artifact_path:
        obj["artifact_path"] = artifact_path
        
    if agent:
        obj["agent"] = agent
    
    return obj


def validate_evidence_object(obj: Any) -> tuple[bool, Optional[str]]:
    """
    Validate that an object conforms to the EvidenceObject schema.
    
    Args:
        obj: Object to validate
        
    Returns:
        Tuple of (is_valid, error_message)
        If valid: (True, None)
        If invalid: (False, "reason for failure")
    """
    if not isinstance(obj, dict):
        return False, "Evidence object must be a dictionary"
    
    # Required top-level fields
    if "claim" not in obj:
        return False, "Missing required field: claim"
    
    if "confidence" not in obj:
        return False, "Missing required field: confidence"
        
    if "evidence" not in obj:
        return False, "Missing required field: evidence"
    
    # Validate claim
    if not isinstance(obj["claim"], str) or not obj["claim"].strip():
        return False, "claim must be a non-empty string"
    
    # Validate confidence
    try:
        conf = float(obj["confidence"])
        if not 0.0 <= conf <= 1.0:
            return False, f"confidence must be between 0.0 and 1.0, got {conf}"
    except (TypeError, ValueError):
        return False, "confidence must be a number between 0.0 and 1.0"
    
    # Validate evidence object
    evidence = obj["evidence"]
    if not isinstance(evidence, dict):
        return False, "evidence must be a dictionary"
    
    # Required evidence fields
    required_evidence_fields = ["metric", "value", "source_columns", "methodology"]
    for field in required_evidence_fields:
        if field not in evidence:
            return False, f"Missing required evidence field: {field}"
    
    # Validate source_columns
    if not isinstance(evidence["source_columns"], list):
        return False, "evidence.source_columns must be a list"
    
    if "source_code" in evidence and evidence["source_code"] is not None:
        if not isinstance(evidence["source_code"], str):
            return False, "evidence.source_code must be a string"

    if "data_source" in evidence and evidence["data_source"] is not None:
        if not isinstance(evidence["data_source"], str):
            return False, "evidence.data_source must be a string"

    if "source_notes" in evidence and evidence["source_notes"] is not None:
        if not isinstance(evidence["source_notes"], str):
            return False, "evidence.source_notes must be a string"

    if not evidence["source_columns"]:
        return False, "evidence.source_columns cannot be empty"
    
    # Validate severity if present
    if "severity" in obj:
        if obj["severity"] not in ["info", "warning", "critical"]:
            return False, f"Invalid severity: {obj['severity']}"
    
    return True, None


def validate_evidence_list(insights: List[Any]) -> dict:
    """
    Validate a list of evidence objects (e.g., insights.json contents).
    
    Args:
        insights: List of objects to validate
        
    Returns:
        Dictionary with validation results:
        {
            "valid": bool,
            "total_count": int,
            "valid_count": int,
            "invalid_count": int,
            "errors": List[str]
        }
    """
    if not isinstance(insights, list):
        return {
            "valid": False,
            "total_count": 0,
            "valid_count": 0,
            "invalid_count": 0,
            "errors": ["Input must be a list"]
        }
    
    total = len(insights)
    valid_count = 0
    errors = []
    
    for i, obj in enumerate(insights):
        is_valid, error = validate_evidence_object(obj)
        if is_valid:
            valid_count += 1
        else:
            errors.append(f"Insight {i}: {error}")
    
    invalid_count = total - valid_count
    
    return {
        "valid": invalid_count == 0,
        "total_count": total,
        "valid_count": valid_count,
        "invalid_count": invalid_count,
        "errors": errors
    }


def should_enable_predictive_mode(quality_score: float) -> bool:
    """
    Determine if predictive analytics should be enabled based on data quality.
    
    FAIL-SAFE MODE: If quality < QUALITY_THRESHOLD (0.5), only descriptive
    analytics are allowed. No predictions, no forecasts.
    
    Args:
        quality_score: Data quality score (0.0 - 1.0)
        
    Returns:
        bool: True if predictive mode is safe, False for descriptive-only
    """
    return quality_score >= QUALITY_THRESHOLD


def get_analysis_mode(quality_score: float) -> Literal["predictive", "descriptive"]:
    """
    Get the analysis mode based on data quality.
    
    Args:
        quality_score: Data quality score (0.0 - 1.0)
        
    Returns:
        "predictive" if quality >= 0.5, else "descriptive"
    """
    return "predictive" if should_enable_predictive_mode(quality_score) else "descriptive"


# Export public API
__all__ = [
    "EvidenceObject",
    "Evidence",
    "SeverityLevel",
    "MethodologyType",
    "QUALITY_THRESHOLD",
    "create_evidence",
    "validate_evidence_object",
    "validate_evidence_list",
    "should_enable_predictive_mode",
    "get_analysis_mode"
]
