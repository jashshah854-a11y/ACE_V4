"""Validation sentry ensuring every narrative references traceable evidence."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from .state_manager import StateManager


class EvidenceSentry:
    def __init__(self, state_manager: StateManager):
        self.state_manager = state_manager
        self.registry: Dict[str, Any] = state_manager.read("evidence_registry") or {}

    def reload(self) -> None:
        self.registry = self.state_manager.read("evidence_registry") or {}

    def _lookup(self, evidence_id: str) -> Optional[Dict[str, Any]]:
        return self.registry.get(evidence_id)

    def block_null_evidence(self, insights: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], float]:
        if not insights:
            return [], [], 0.0
        kept: List[Dict[str, Any]] = []
        dropped: List[Dict[str, Any]] = []
        for insight in insights:
            evidence_id = insight.get("evidence_ref") or insight.get("evidence_id")
            if evidence_id and self._lookup(evidence_id):
                kept.append(insight)
            else:
                dropped.append({"insight": insight, "reason": "Missing evidence"})
        ratio = len(dropped) / max(len(insights), 1)
        return kept, dropped, ratio

    def verify_audit_trail(self) -> List[str]:
        missing = []
        for evidence_id in self.registry.keys():
            path = self.state_manager.run_path / "artifacts" / "evidence" / f"{evidence_id}.json"
            if not path.exists():
                missing.append(evidence_id)
        return missing

    def enforce(self, insights: List[Dict[str, Any]]) -> Dict[str, Any]:
        kept, dropped, ratio = self.block_null_evidence(insights)
        missing_artifacts = self.verify_audit_trail()
        safe_mode = ratio > 0.2
        if safe_mode:
            self.state_manager.write(
                "sentry_safe_mode",
                {"dropped_ratio": ratio, "dropped_count": len(dropped)},
            )
        if missing_artifacts:
            self.state_manager.write("sentry_missing_artifacts", missing_artifacts)
        return {
            "insights": kept,
            "dropped": dropped,
            "safe_mode": safe_mode,
            "missing_artifacts": missing_artifacts,
        }
