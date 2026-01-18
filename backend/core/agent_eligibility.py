from __future__ import annotations

from typing import Dict, Optional, Literal, TypedDict, Any

EligibilityStatus = Literal["eligible", "not_applicable", "blocked"]


class EligibilityDecision(TypedDict):
    status: EligibilityStatus
    reason_code: Optional[str]
    message: Optional[str]


TARGET_DEPENDENT_AGENTS = {
    "regression",
    "fabricator",
}


def resolve_agent_eligibility(agent: str, analysis_intent: Optional[Dict[str, Any]]) -> EligibilityDecision:
    intent_payload = analysis_intent or {}
    intent = str(intent_payload.get("intent") or "exploratory").lower()
    target_candidate = intent_payload.get("target_candidate") or {}
    target_detected = bool(target_candidate.get("detected"))
    agent_name = (agent or "").lower()

    if agent_name in TARGET_DEPENDENT_AGENTS:
        if intent == "exploratory":
            return {
                "status": "not_applicable",
                "reason_code": "intent_exploratory",
                "message": "Predictive agent not applicable for exploratory intent.",
            }
        if intent in {"predictive", "causal", "automation"} and not target_detected:
            return {
                "status": "not_applicable",
                "reason_code": "target_missing",
                "message": "Target-dependent agent not applicable without a target.",
            }

    return {"status": "eligible", "reason_code": None, "message": None}
