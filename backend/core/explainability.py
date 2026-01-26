"""Explainability primitives for ACE's white-box governance layer."""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Protocol, Sequence, Tuple, runtime_checkable


@dataclass
class EvidenceObject:
    columns_used: List[str]
    computation_method: str
    result_statistic: Dict[str, Any]
    confidence_level: float
    data_confidence: Optional[float] = None
    limitations: List[str] = field(default_factory=list)
    source_code: Optional[str] = None
    data_source: Optional[str] = None
    source_notes: Optional[str] = None

    def validate(self) -> None:
        if not self.columns_used:
            raise ValueError("EvidenceObject requires at least one column reference.")
        if not self.computation_method:
            raise ValueError("EvidenceObject must document a computation method.")
        if not isinstance(self.result_statistic, dict) or not self.result_statistic:
            raise ValueError("EvidenceObject.result_statistic must describe the outcome.")
        if not isinstance(self.confidence_level, (int, float)):
            raise ValueError("EvidenceObject needs a numeric confidence level.")

    def to_payload(self, evidence_id: Optional[str] = None) -> Dict[str, Any]:
        self.validate()
        payload = asdict(self)
        payload["evidence_id"] = evidence_id or str(uuid.uuid4())[:8]
        payload["timestamp"] = datetime.now(timezone.utc).isoformat()
        return payload


default_trace: List[Dict[str, Any]] = []


@dataclass
class FeatureImportanceEntry:
    feature: str
    importance: float

    def as_dict(self) -> Dict[str, Any]:
        return {"feature": self.feature, "importance": self.importance}


@dataclass
class ModelOutputEnvelope:
    entity: str
    values: Sequence[Dict[str, Any]]

    def validate(self) -> None:
        if not self.entity:
            raise ValueError("Model output must name its business entity.")
        if not isinstance(self.values, Sequence):
            raise ValueError("Model output values must be a sequence of dictionaries.")


@runtime_checkable
class IExplainableModel(Protocol):
    name: str

    def fit(self, X, y=None) -> None:
        ...

    def predict(self, X) -> ModelOutputEnvelope:
        ...

    def get_evidence(self) -> EvidenceObject:
        ...

    def get_feature_importance(self) -> List[FeatureImportanceEntry]:
        ...

    def get_confidence_interval(self) -> Tuple[float, float]:
        ...

    def serialize_artifacts(self) -> Dict[str, Any]:
        ...


def record_trace(operation: str, columns: Sequence[str], result: Optional[Dict[str, Any]] = None) -> None:
    default_trace.append(
        {
            "operation": operation,
            "columns": list(columns),
            "result": result or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )


def export_trace_log(target: Path) -> None:
    if not default_trace:
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    with open(target, "w", encoding="utf-8") as handle:
        json.dump(default_trace, handle, indent=2)


def persist_evidence(state_manager, evidence: Dict[str, Any] | EvidenceObject, scope: str = "generic") -> str:
    payload = evidence.to_payload() if isinstance(evidence, EvidenceObject) else dict(evidence)
    payload.setdefault("scope", scope)
    evidence_id = payload.setdefault("evidence_id", str(uuid.uuid4())[:8])
    registry = state_manager.read("evidence_registry") or {}
    registry[evidence_id] = payload
    state_manager.write("evidence_registry", registry)

    artifact_dir = Path(state_manager.get_file_path("artifacts")) / "evidence"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    with open(artifact_dir / f"{evidence_id}.json", "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
    return evidence_id


def load_evidence_registry(state_manager) -> Dict[str, Any]:
    return state_manager.read("evidence_registry") or {}