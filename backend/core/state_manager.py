import json
import os
from pathlib import Path
from typing import Any, Optional


class _NumpyEncoder(json.JSONEncoder):
    """JSON encoder that safely serializes numpy scalar types produced by pandas/sklearn agents."""
    def default(self, obj):
        try:
            import numpy as np
            if isinstance(obj, np.bool_):
                return bool(obj)
            if isinstance(obj, np.integer):
                return int(obj)
            if isinstance(obj, np.floating):
                return float(obj)
            if isinstance(obj, np.ndarray):
                return obj.tolist()
        except ImportError:
            pass
        return super().default(obj)

class StateManager:
    def __init__(self, run_path: str, redis_url: Optional[str] = None):
        self.run_path = Path(run_path)
        self.redis_client = None
        self.run_id = self.run_path.name
        
        # Auto-detect Redis URL from env if not provided
        if not redis_url:
            redis_url = os.getenv("REDIS_URL")
            
        if redis_url:
            try:
                import redis
                self.redis_client = redis.from_url(redis_url, decode_responses=True)
            except Exception:
                pass

    def _get_redis_key(self, name: str) -> str:
        return f"ace:run:{self.run_id}:{name}"

    def write(self, name: str, data: Any):
        """
        Writes data to a JSON file in the run folder AND Redis (if available).
        """
        from core.run_manifest import get_artifact_step, get_artifact_type, register_artifact
        from core.run_manifest import update_render_policy, update_step_status, _read_manifest, remove_artifact
        from core.invariants import run_invariants
        from core.run_manifest import read_manifest
        if name == "regression_insights":
            regression_status = self.read("regression_status") or "not_started"
            if regression_status != "success":
                print("[StateManager] Refusing to persist regression_insights without success status")
                return
        if name in {"regression_insights", "enhanced_analytics"}:
            from core.analytics_validation import validate_artifact
            validation = validate_artifact(name, data)
            if not validation.get("valid"):
                print(f"[StateManager] Refusing to persist invalid artifact: {name}")
                return
        artifact_step = get_artifact_step(name)
        manifest = _read_manifest(self.run_path)
        if artifact_step and manifest:
            step_status = (manifest.get("steps") or {}).get(artifact_step, {}).get("status")
            # Allow writing during "running" (normal agent execution) or "success" (post-finalize)
            if step_status not in (None, "running", "success", "pending"):
                print(f"[StateManager] Refusing to persist artifact {name}; step status is {step_status}.")
                return
        if artifact_step and isinstance(data, dict) and data.get("valid") is False:
            print(f"[StateManager] Refusing to persist invalid artifact: {name}")
            return
        # 1. Write to Disk
        filename = f"{name}.json"
        path = self.run_path / filename
        tmp_path = self.run_path / f"{filename}.tmp"
        
        # Handle Pydantic models
        if hasattr(data, "model_dump"):
            data = data.model_dump()
        
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, cls=_NumpyEncoder)

    def read(self, name: str) -> Optional[Any]:
        """
        Reads data from Disk, falling back to Redis if missing.
        """
        if name == "data_validation_report":
            print("[StateManager] WARNING: data_validation_report is deprecated; use validation_report instead.")
        # 1. Try Disk
        path = self.run_path / f"{name}.json"
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass # Corrupt file, fall back to Redis
        
        # 2. Try Redis
        if self.redis_client:
            try:
                key = self._get_redis_key(name)
                data_str = self.redis_client.get(key)
                if data_str:
                    return json.loads(data_str)
            except Exception:
                pass
                
        return None

    def exists(self, name: str) -> bool:
        """
        Checks if a state file exists (Disk or Redis).
        """
        if (self.run_path / f"{name}.json").exists():
            return True
            
        if self.redis_client:
            return bool(self.redis_client.exists(self._get_redis_key(name)))
            
        return False

    def delete(self, name: str) -> None:
        """Remove a state file and any cached Redis entry for this key."""
        path = self.run_path / f"{name}.json"
        if path.exists():
            try:
                path.unlink()
            except Exception:
                pass
        if self.redis_client:
            try:
                self.redis_client.delete(self._get_redis_key(name))
            except Exception:
                pass
    
    def get_file_path(self, filename: str) -> str:
        """
        Returns the full path for a file within the run directory.
        Useful for saving non-JSON artifacts like CSVs or Markdown.
        """
        return str(self.run_path / filename)
