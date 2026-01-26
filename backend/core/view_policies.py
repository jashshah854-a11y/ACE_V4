from __future__ import annotations

from typing import Dict, List


def build_view_policies(render_policy: Dict[str, bool], analysis_allowed: List[str]) -> Dict[str, Dict[str, List[str]]]:
    allowed = set(analysis_allowed or [])

    base_primary = [
        "governing_thought",
        "key_metrics",
        "supporting_evidence",
        "action_items",
        "trust_summary",
    ]

    executive_sections = base_primary
    analyst_sections = base_primary
    expert_sections = base_primary

    if render_policy and not render_policy.get("allow_regression_sections", False):
        if "supporting_evidence" in analyst_sections:
            analyst_sections = [s for s in analyst_sections if s != "supporting_evidence"]
        if "supporting_evidence" in expert_sections:
            expert_sections = [s for s in expert_sections if s != "supporting_evidence"]

    return {
        "executive": {"allowed_sections": executive_sections, "default_collapsed_sections": []},
        "analyst": {"allowed_sections": analyst_sections, "default_collapsed_sections": []},
        "expert": {"allowed_sections": expert_sections, "default_collapsed_sections": []},
    }
