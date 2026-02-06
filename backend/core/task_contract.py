import json
from pathlib import Path
from typing import Dict, Any

from core.router import select_task


def build_task_contract(
    identity_card: Dict[str, Any],
    validation_report: Dict[str, Any],
    drift_status: str,
    has_target: bool,
    target_is_binary: bool,
) -> Dict[str, Any]:
    router = select_task(identity_card.get("data_type"), has_target, target_is_binary)
    contract = {
        "task": router["task"],
        "template": router["template"],
        "data_type": router["data_type"],
        "allowed_sections": [],
        "forbidden_sections": [],
        "limitations": [],
    }

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

