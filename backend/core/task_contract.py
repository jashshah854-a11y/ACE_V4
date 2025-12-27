import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from core.router import select_task

VALID_OUTPUT_TYPES = {"diagnostic", "descriptive", "predictive"}
BANNED_FISHING_TERMS = re.compile(r"\b(overview|summary|anything|whatever|trends?|insights?|explore|interesting)\b", re.IGNORECASE)
EXCLUSION_PATTERN = re.compile(r"(?:no|exclude|without)\s+([A-Za-z0-9 _\-/]+)", re.IGNORECASE)


class TaskIntentValidationError(ValueError):
    """Raised when the user intent payload is missing or too vague."""

    def __init__(self, message: str, reformulation: Optional[str] = None):
        super().__init__(message)
        self.reformulation = reformulation


REFORMULATION_PROMPT = (
    "Your request is too vague. Are you trying to: A) Optimize pricing? B) Identify churn risks? or C) Audit performance?"
)


def _clean_text(value: Optional[str]) -> str:
    if not value:
        return ""
    return " ".join(str(value).strip().split())


def _word_count(value: str) -> int:
    return len(re.findall(r"[A-Za-z0-9']+", value))


def _validate_clause(name: str, text: str, min_words: int = 8) -> None:
    if len(text) < 25 or _word_count(text) < min_words:
        raise TaskIntentValidationError(
            f"Error: {name.replace('_', ' ').title()} missing. Please specify the business decision.",
            reformulation=REFORMULATION_PROMPT,
        )
    if BANNED_FISHING_TERMS.search(text):
        raise TaskIntentValidationError(
            f"Error: {name.replace('_', ' ').title()} contains vague wording. Please specify the business decision.",
            reformulation=REFORMULATION_PROMPT,
        )


def _extract_scope_constraints(text: str) -> List[str]:
    if not text:
        return []
    matches = [match.group(1).strip(" .,") for match in EXCLUSION_PATTERN.finditer(text)]
    cleaned = [m for m in matches if m]
    return list(dict.fromkeys(cleaned))


def parse_task_intent(payload: Any) -> Dict[str, Any]:
    """Validate and normalize the structured intent payload from the client."""
    if payload is None:
        raise TaskIntentValidationError("Task intent payload is required.", reformulation=REFORMULATION_PROMPT)

    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError as exc:
            raise TaskIntentValidationError(f"Task intent must be JSON: {exc}") from exc

    if not isinstance(payload, dict):
        raise TaskIntentValidationError("Task intent must be a JSON object.")

    primary_question = _clean_text(payload.get("primary_question"))
    decision_context = _clean_text(payload.get("decision_context"))
    required_output = _clean_text(payload.get("required_output_type")).lower()
    success_criteria = _clean_text(payload.get("success_criteria"))
    constraints = _clean_text(payload.get("constraints"))

    # Make validation optional - provide defaults if fields are empty
    if not primary_question or len(primary_question) < 25:
        primary_question = "Analyze dataset to identify patterns, trends, and actionable insights for business decision-making"
    elif BANNED_FISHING_TERMS.search(primary_question):
        # Only validate if user provided something - don't block on vague terms
        pass  # Allow vague terms for now
    
    if not decision_context or len(decision_context) < 25:
        decision_context = "General business intelligence and data exploration to support strategic planning and operational improvements"

    if required_output not in VALID_OUTPUT_TYPES:
        raise TaskIntentValidationError(
            "Error: required_output_type must be diagnostic, descriptive, or predictive.",
            reformulation="Please choose the analysis type that answers your decision question.",
        )

    exclusions = _extract_scope_constraints(constraints)
    threshold_raw = payload.get("confidence_threshold") or payload.get("minimum_confidence") or 80
    try:
        threshold = float(threshold_raw)
        if threshold <= 1:
            threshold *= 100
    except (TypeError, ValueError):
        threshold = 80.0
    threshold = max(50.0, min(99.0, threshold))

    intent = {
        "primary_question": primary_question,
        "decision_context": decision_context,
        "required_output_type": required_output,
        "success_criteria": success_criteria,
        "constraints": constraints,
        "confidence_threshold": threshold,
        "out_of_scope_dimensions": exclusions,
    }
    return intent


def _rank_columns(identity_card: Dict[str, Any]) -> List[str]:
    columns = identity_card.get("columns") or {}
    ranked = []
    for name, meta in columns.items():
        null_pct = meta.get("null_pct") or 0
        try:
            null_pct = float(null_pct)
        except (TypeError, ValueError):
            null_pct = 0
        ranked.append((null_pct, name))
    ranked.sort(key=lambda item: (item[0], item[1]))
    return [name for _, name in ranked]


def _derive_scope_inclusions(identity_card: Dict[str, Any], validation_report: Dict[str, Any], intent: Optional[Dict[str, Any]]) -> List[str]:
    ranked = _rank_columns(identity_card)
    inclusions = ranked[:10]
    target = validation_report.get("target_column")
    if target and target not in inclusions:
        inclusions.insert(0, target)
    if intent:
        question_terms = [word.lower() for word in intent["primary_question"].split() if len(word) > 3]
        for name in ranked:
            if any(term in name.lower() for term in question_terms) and name not in inclusions:
                inclusions.append(name)
    return inclusions


def _derive_scope_exclusions(identity_card: Dict[str, Any], intent: Optional[Dict[str, Any]]) -> List[str]:
    columns = identity_card.get("columns") or {}
    exclusions = []
    for name, meta in columns.items():
        null_pct = meta.get("null_pct") or 0
        try:
            null_pct = float(null_pct)
        except (TypeError, ValueError):
            null_pct = 0
        if null_pct >= 0.5:
            exclusions.append(name)
    if intent:
        exclusions.extend(intent.get("out_of_scope_dimensions", []))
    # Preserve order but deduplicate
    seen = set()
    ordered = []
    for item in exclusions:
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        ordered.append(item)
    return ordered


def build_task_contract(
    identity_card: Dict[str, Any],
    validation_report: Dict[str, Any],
    drift_status: str,
    has_target: bool,
    target_is_binary: bool,
    user_intent: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    drift_status = (drift_status or "none").lower()
    router = select_task(identity_card.get("data_type"), has_target, target_is_binary)
    contract: Dict[str, Any] = {
        "task": router["task"],
        "template": router["template"],
        "data_type": router["data_type"],
        "allowed_sections": [],
        "forbidden_sections": [],
        "limitations": [],
        "scope_inclusions": [],
        "scope_exclusions": [],
        "forbidden_claims": {
            "allow_causality": False,
            "allow_forecasting": drift_status not in {"block", "warn"},
        },
    }

    if drift_status == "block":
        contract["limitations"].append("Drift blocking: restrict to diagnostics.")
        contract["allowed_sections"] = ["data_overview", "quality"]
        contract["forbidden_sections"] = ["modeling", "recommendations", "insights"]
    else:
        if router["task"] in ("regression", "classification"):
            contract["allowed_sections"] = ["data_overview", "quality", "eda", "modeling", "insights"]
        else:
            contract["allowed_sections"] = ["data_overview", "quality", "eda", "clustering", "insights"]

    if validation_report.get("mode") == "limitations":
        contract["limitations"].append("Validation in limitation mode; insights downgraded.")

    contract["scope_inclusions"] = _derive_scope_inclusions(identity_card, validation_report, user_intent)
    contract["scope_exclusions"] = _derive_scope_exclusions(identity_card, user_intent)

    if user_intent:
        contract.update(
            {
                "primary_question": user_intent.get("primary_question"),
                "decision_context": user_intent.get("decision_context"),
                "required_output_type": user_intent.get("required_output_type"),
                "success_criteria": user_intent.get("success_criteria"),
                "constraints": user_intent.get("constraints"),
                "confidence_threshold": user_intent.get("confidence_threshold", 80.0),
                "out_of_scope_dimensions": user_intent.get("out_of_scope_dimensions", []),
                "is_signed": True,
                "signed_at": datetime.utcnow().isoformat() + "Z",
            }
        )
    else:
        contract.update(
            {
                "primary_question": "",
                "decision_context": "",
                "required_output_type": "diagnostic",
                "success_criteria": "",
                "constraints": "",
                "confidence_threshold": 80.0,
                "out_of_scope_dimensions": [],
                "is_signed": False,
            }
        )

    return contract


def save_task_contract(path: Path, contract: Dict[str, Any]):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(contract, f, indent=2)
    tmp.replace(path)
