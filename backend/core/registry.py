import json
import uuid
from pathlib import Path
from typing import Dict, Optional, Any, List


REGISTRY_PATH = Path("data") / "registry.json"


def _ensure_dir():
    REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)


def _atomic_write(path: Path, payload: Dict):
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    tmp.replace(path)


def load_registry() -> Dict:
    _ensure_dir()
    if not REGISTRY_PATH.exists():
        return {"models": []}
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def register_model(
    metrics: Dict[str, Any],
    stage: str = "staging",
    lineage: Optional[Dict[str, Any]] = None,
    artifact_path: Optional[str] = None,
) -> str:
    """
    Register a model version with metrics and stage.
    Returns model_id.
    """
    registry = load_registry()
    model_id = str(uuid.uuid4())[:8]
    entry = {
        "model_id": model_id,
        "stage": stage,
        "metrics": metrics,
        "artifact_path": artifact_path,
        "lineage": lineage or {},
    }
    registry.setdefault("models", []).append(entry)
    _atomic_write(REGISTRY_PATH, registry)
    return model_id


def promote_model(model_id: str, stage: str = "production") -> bool:
    registry = load_registry()
    updated = False
    for m in registry.get("models", []):
        if m.get("model_id") == model_id:
            m["stage"] = stage
            updated = True
    if updated:
        _atomic_write(REGISTRY_PATH, registry)
    return updated


def latest_by_stage(stage: str = "production") -> Optional[Dict]:
    registry = load_registry()
    models: List[Dict] = [m for m in registry.get("models", []) if m.get("stage") == stage]
    if not models:
        return None
    return models[-1]



