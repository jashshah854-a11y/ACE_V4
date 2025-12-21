import json
from pathlib import Path
from typing import Dict, Tuple, List

from core.identity_card import build_identity_card, save_identity_card
from core.task_contract import build_task_contract, save_task_contract
from core.confidence import compute_data_confidence
from core.insights import validate_insights, load_insights
from core.state_manager import StateManager

INSIGHT_AGENTS = {"overseer", "regression", "personas", "fabricator", "expositor"}

# Confidence score below this should suppress insight-bearing sections.
CONFIDENCE_HARD_CUTOFF = 0.2


def is_confidence_blocked(confidence: Dict) -> Tuple[bool, str]:
    """
    Determine whether confidence should hard-block insight/ranking generation.
    Blocks when the numeric score is low/zero, label is low, or confidence is absent.
    """
    if not confidence:
        return True, "Confidence report missing"
    score = confidence.get("data_confidence")
    label = confidence.get("confidence_label")
    if score is not None and score <= CONFIDENCE_HARD_CUTOFF:
        return True, f"Data confidence {score:.2f} at/below cutoff"
    if label == "low":
        return True, "Low data confidence"
    return False, ""

# Mapping of agents to sections they need enabled in the task contract
AGENT_SECTION_MAP: Dict[str, List[str]] = {
    "overseer": ["insights", "eda"],
    "regression": ["modeling", "insights"],
    "personas": ["insights"],
    "fabricator": ["insights"],
    "expositor": ["insights"],
}


def _load_json_if_exists(path: str) -> Dict:
    p = Path(path)
    if not p.exists():
        return {}
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def rebuild_governance_artifacts(state_manager: StateManager) -> Dict[str, Dict]:
    """
    Rebuild identity card, task contract, and confidence report from current state.
    Returns dict with rebuilt artifacts.
    """
    run_path = state_manager.run_path
    artifacts_dir = Path(run_path) / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    ingestion_meta = state_manager.read("ingestion_meta") or {}
    schema_profile = _load_json_if_exists(ingestion_meta.get("schema_profile", "")) if isinstance(ingestion_meta, dict) else {}
    drift_report = _load_json_if_exists(ingestion_meta.get("drift_report", "")) if isinstance(ingestion_meta, dict) else {}
    data_type = state_manager.read("data_type_identification") or state_manager.read("data_type") or {}

    identity_card = build_identity_card(schema_profile or {}, data_type or {}, drift_report or {}, source_path=str(ingestion_meta.get("source_path") or ingestion_meta.get("path") or ""))  # type: ignore[arg-type]
    card_path = artifacts_dir / "dataset_identity_card.json"
    save_identity_card(card_path, identity_card)
    state_manager.write("dataset_identity_card", identity_card)

    validation_report = state_manager.read("data_validation_report") or state_manager.read("validation_report") or {}
    target_col = validation_report.get("target_column")
    has_target = bool(target_col)
    target_is_binary = bool(validation_report.get("target_is_binary"))

    task_contract = build_task_contract(
        identity_card,
        validation_report,
        ingestion_meta.get("drift_status", "none") if isinstance(ingestion_meta, dict) else "none",
        has_target=has_target,
        target_is_binary=target_is_binary,
    )
    contract_path = artifacts_dir / "task_contract.json"
    save_task_contract(contract_path, task_contract)
    state_manager.write("task_contract", task_contract)

    confidence = compute_data_confidence(identity_card, validation_report, ingestion_meta.get("drift_status", "none") if isinstance(ingestion_meta, dict) else "none")
    conf_path = artifacts_dir / "confidence_report.json"
    with open(conf_path, "w", encoding="utf-8") as f:
        json.dump(confidence, f, indent=2)
    state_manager.write("confidence_report", confidence)

    return {
        "identity_card": identity_card,
        "task_contract": task_contract,
        "confidence_report": confidence,
    }


def should_block_agent(agent: str, state_manager: StateManager) -> Tuple[bool, str]:
    """Determine if an agent must be blocked due to governance artifacts."""
    if agent not in INSIGHT_AGENTS:
        return False, ""

    identity_card = state_manager.read("dataset_identity_card") or {}
    if not identity_card:
        return True, "Missing identity card"

    contract = state_manager.read("task_contract") or {}
    validation = state_manager.read("data_validation_report") or {}
    confidence = state_manager.read("confidence_report") or {}

    reasons: List[str] = []

    if validation.get("blocked_agents") and agent in set(validation.get("blocked_agents")):
        reasons.append("Blocked by validator")
    if validation.get("mode") == "limitations" or not validation.get("allow_insights", True):
        reasons.append("Validation in limitation mode")

    conf_label = confidence.get("confidence_label")
    confidence_blocked, conf_reason = is_confidence_blocked(confidence)
    if confidence_blocked:
        reasons.append(conf_reason)

    required_sections = set(AGENT_SECTION_MAP.get(agent, []))
    allowed_sections = set(contract.get("allowed_sections", []))
    forbidden_sections = set(contract.get("forbidden_sections", []))

    if required_sections and not required_sections.issubset(allowed_sections):
        reasons.append("Task contract forbids required sections")
    if agent == "regression" and "modeling" in forbidden_sections:
        reasons.append("Modeling forbidden by contract")

    if reasons:
        return True, "; ".join(reasons)

    return False, ""


def render_governed_report(state_manager: StateManager, insights_path: Path) -> Dict:
    """
    Produce a governance-aware report artifact:
    - Only allowed sections per task contract
    - Only evidence-valid insights
    - Includes limitations and confidence
    """
    contract = state_manager.read("task_contract") or {}
    allowed_sections = set(contract.get("allowed_sections", []))
    limitations = state_manager.read("limitations") or []
    confidence = state_manager.read("confidence_report") or {}
    validation = state_manager.read("data_validation_report") or {}
    data_type = (state_manager.read("data_type_identification") or {}).get("primary_type")

    raw_insights = load_insights(insights_path) if insights_path.exists() else []
    valid_report = validate_insights(raw_insights)
    insights = raw_insights if valid_report["ok"] and "insights" in allowed_sections else []

    if not valid_report["ok"]:
        limitations.append({"agent": "expositor", "message": "Insights missing evidence; omitted from report.", "severity": "error"})

    # If insights not allowed, ensure they are not emitted and note the limitation
    if "insights" not in allowed_sections:
        if insights:
            insights = []
        limitations.append({"agent": "expositor", "message": "Insights section not allowed by task contract.", "severity": "warning"})

    confidence_blocked, conf_reason = is_confidence_blocked(confidence)
    if confidence_blocked:
        insights = []
        limitations.append({"agent": "governance", "message": f"Insights suppressed: {conf_reason}", "severity": "error"})

    report = {
        "mode": "limitations" if validation.get("mode") == "limitations" or confidence_blocked else "insight",
        "allowed_sections": list(allowed_sections),
        "data_type": data_type,
        "confidence": confidence,
        "limitations": limitations,
        "insights": insights,
    }

    output_path = state_manager.run_path / "artifacts" / "governed_report.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    state_manager.write("governed_report_meta", {"path": str(output_path), "mode": report["mode"]})
    return report

