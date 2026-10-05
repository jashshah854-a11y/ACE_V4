import json
import math
from copy import deepcopy
from pathlib import Path
from typing import Dict, Any, List

from core.router import select_task


def parse_task_intent(value: Any) -> Dict[str, Any]:
    """Validate a supplied analysis request without inventing missing context."""
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (ValueError, TypeError) as exc:
            raise ValueError("task_intent must be valid JSON") from exc
    if not isinstance(value, dict):
        raise ValueError("task_intent must be a JSON object")
    intent = deepcopy(value)
    if "primary_question" not in intent and "question" in intent:
        intent["primary_question"] = intent["question"]
    intent.pop("question", None)
    question = intent.get("primary_question")
    if not isinstance(question, str) or not question.strip():
        raise ValueError("task_intent.primary_question must be a non-empty string")
    for field in ("decision_context", "success_criteria", "constraints"):
        if field in intent and not isinstance(intent[field], str):
            raise ValueError(f"task_intent.{field} must be a string")
    if "required_output_type" in intent and intent["required_output_type"] not in (
        "diagnostic", "descriptive", "predictive"
    ):
        raise ValueError("task_intent.required_output_type must be diagnostic, descriptive, or predictive")
    if "confidence_threshold" in intent:
        threshold = intent["confidence_threshold"]
        if (isinstance(threshold, bool) or not isinstance(threshold, (int, float))
                or not 0 <= threshold <= 100 or not math.isfinite(threshold)):
            raise ValueError("task_intent.confidence_threshold must be a finite number from 0 to 100")
    return intent


def enforce_quality_failsafe(
    identity_card: Dict[str, Any],
    contract: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Enforce fail-safe mode if dataset quality is below threshold.
    
    Rules (ACE Engine Guidelines Source [1]):
    - quality_score < 0.4 → FORCE descriptive mode (LOWERED from 0.75)
    - Disable predictive agents (regression, personas, fabricator)
    - Only allow data_overview, quality, eda sections
    
    This is the "Safety Catch" - the gun must not fire on bad ammo.
    """
    # Read from scanner output (where we set min floor of 0.4)
    quality_score = identity_card.get("quality_score", 0.4)
    
    # DEBUG: Log the quality score check
    print(f"[GOVERNANCE DEBUG] Quality score check: {quality_score}", flush=True)
    print(f"[GOVERNANCE DEBUG] Threshold: 0.4 (lowered from 0.75)", flush=True)
    
    if quality_score < 0.4:
        contract["analysis_mode"] = "descriptive"
        contract["quality_failsafe_triggered"] = True
        
        # Extend forbidden sections (don't replace - preserve drift blocks)
        forbidden = set(contract.get("forbidden_sections", []))
        forbidden.update(["modeling", "predictions", "recommendations"])
        contract["forbidden_sections"] = list(forbidden)
        
        # Explicitly list forbidden agents
        contract["forbidden_agents"] = [
            "regression",
            "personas", 
            "fabricator"
        ]
        
        contract["limitations"].append(
            f"Quality score {quality_score:.2f} < 0.40: Analysis restricted to descriptive mode only. "
            f"Predictive modeling disabled to prevent hallucinations."
        )
        
        # Disable all speculative claims
        contract["forbidden_claims"]["allow_forecasting"] = False
        contract["forbidden_claims"]["allow_causality"] = False
        contract["forbidden_claims"]["allow_clustering"] = False
    
    return contract


def derive_forbidden_analyses(
    identity_card: Dict[str, Any]
) -> List[str]:
    """
    Determine which analyses are structurally impossible based on data capabilities.
    
    Returns list of forbidden analysis types (ACE Engine Guidelines Source [3]).
    
    Examples:
    - No date column → Cannot forecast
    - No numeric columns → Cannot regress
    - < 30 rows → Cannot cluster
    """
    forbidden = []
    columns = identity_card.get("columns", {})
    
    # Check for time-series capability
    has_date_column = any(
        "date" in str(col).lower() or 
        "time" in str(col).lower() or
        "year" in str(col).lower() or
        "month" in str(col).lower()
        for col in columns.keys()
    )
    
    if not has_date_column:
        forbidden.append("forecasting")
        forbidden.append("time_series_analysis")
    
    # Check for numeric columns (required for regression)
    has_numeric = any(
        str(meta.get("dtype", "")).startswith(("int", "float"))
        for meta in columns.values()
    )
    
    if not has_numeric:
        forbidden.append("regression")
        forbidden.append("correlation_analysis")
    
    # Check for categorical columns (required for segmentation)
    has_categorical = any(
        meta.get("dtype") == "object" or 
        (meta.get("distinct_pct", 1.0) < 0.1 and meta.get("distinct_pct", 1.0) > 0)
        for meta in columns.values()
    )
    
    if not has_categorical:
        forbidden.append("segmentation")
        forbidden.append("clustering")
    
    # Check minimum row count for statistical validity
    row_count = identity_card.get("row_count", 0)
    if row_count < 30:
        forbidden.extend(["regression", "clustering", "statistical_testing"])
    
    return forbidden


def build_task_contract(
    identity_card: Dict[str, Any],
    validation_report: Dict[str, Any],
    drift_status: str,
    has_target: bool,
    target_is_binary: bool,
    user_intent: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    router = select_task(identity_card.get("data_type"), has_target, target_is_binary)
    contract = {
        "task": router["task"],
        "template": router["template"],
        "data_type": router["data_type"],
        "allowed_sections": [],
        "forbidden_sections": [],
        "limitations": [],
        "is_signed": False,
    }
    if user_intent is not None:
        intent = parse_task_intent(user_intent)
        contract["user_intent"] = intent
        # Existing governance uses this flag for a supplied, validated task request.
        contract["is_signed"] = True
        for field in ("primary_question", "decision_context", "success_criteria",
                      "constraints", "required_output_type", "confidence_threshold"):
            if field in intent:
                contract[field] = intent[field]

    # Gating
    if drift_status == "block":
        contract["limitations"].append("Drift blocking: restrict to diagnostics.")
        contract["allowed_sections"] = ["data_overview", "quality"]
        contract["forbidden_sections"] = ["modeling", "recommendations"]
    else:
        if router["task"] in ("regression", "classification"):
            contract["allowed_sections"] = ["data_overview", "quality", "eda", "modeling", "insights"]
        else:
            contract["allowed_sections"] = ["data_overview", "quality", "eda", "clustering", "insights"]

    if validation_report.get("mode") == "limitations":
        contract["limitations"].append("Validation in limitation mode; insights downgraded.")

    return contract


def save_task_contract(path: Path, contract: Dict[str, Any]):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(contract, f, indent=2)
    tmp.replace(path)

