import json
import os
from pathlib import Path
from typing import Any, Optional


def _json_default(obj: Any):
    try:
        import numpy as np  # type: ignore

        if isinstance(obj, (np.integer, np.floating)):
            return obj.item()
        if isinstance(obj, np.bool_):
            return bool(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
    except Exception:
        pass
    if isinstance(obj, set):
        return list(obj)
    try:
        return str(obj)
    except Exception:
        return None


def _register_enhanced_sections(
    run_path: Path,
    payload: dict,
    dataset_fingerprint: str,
    update_step_status,
    register_artifact,
    get_artifact_type,
) -> None:
    section_steps = (
        "correlation_analysis",
        "correlation_ci",
        "distribution_analysis",
        "quality_metrics",
        "business_intelligence",
        "feature_importance",
    )
    for section_name in section_steps:
        section = payload.get(section_name)
        if section is None:
            if section_name == "correlation_ci":
                continue
            update_step_status(run_path, section_name, "skipped")
            continue
        if not isinstance(section, dict):
            update_step_status(run_path, section_name, "failed")
            continue
        valid = section.get("valid") is True
        status = section.get("status") or ("success" if valid else "failed")
        step_name = "correlation_analysis" if section_name == "correlation_ci" else section_name
        if section_name != "correlation_ci":
            update_step_status(run_path, step_name, "success" if valid else "failed")
        elif valid:
            update_step_status(run_path, step_name, "success")
        if not valid:
            continue
        register_artifact(
            run_path,
            section_name,
            get_artifact_type(section_name),
            step_name,
            status,
            bool(valid),
            section.get("errors") or [],
            section.get("warnings") or [],
            dataset_fingerprint,
        )

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
            if step_status != "success":
                print(f"[StateManager] Refusing to persist artifact {name}; step not successful.")
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
        
        try:
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, default=_json_default)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp_path, path)
        except Exception:
            # If disk fails (e.g. permission), try to continue to Redis
            pass

        # 2. Write to Redis (Persistence Layer)
        if self.redis_client:
            try:
                key = self._get_redis_key(name)
                # Expire after 24 hours to prevent clutter
                self.redis_client.setex(key, 86400, json.dumps(data, default=_json_default))
            except Exception as e:
                print(f"[StateManager] Redis write failed: {e}")

        if artifact_step and manifest:
            validation_errors = []
            validation_warnings = []
            status = "success"
            valid = True
            if isinstance(data, dict):
                validation_errors = data.get("errors") or []
                validation_warnings = data.get("warnings") or []
                status = data.get("status") or status
                valid = data.get("valid") if data.get("valid") is not None else valid
            register_artifact(
                self.run_path,
                name,
                get_artifact_type(name),
                artifact_step,
                status,
                bool(valid),
                validation_errors,
                validation_warnings,
                manifest.get("dataset_fingerprint", ""),
            )
            if name == "enhanced_analytics" and isinstance(data, dict):
                _register_enhanced_sections(
                    self.run_path,
                    data,
                    manifest.get("dataset_fingerprint", ""),
                    update_step_status,
                    register_artifact,
                    get_artifact_type,
                )
            update_render_policy(self.run_path)
        # Ensure trust is recorded in the manifest before invariants run.
        if name == "trust_object" and isinstance(data, dict):
            from core.run_manifest import update_trust
            update_trust(self.run_path, data)
        enforce_invariants_for = {"final_report", "enhanced_analytics", "trust_object", "regression_insights"}
        if name in enforce_invariants_for:
            manifest_after = read_manifest(self.run_path)
            if manifest_after:
                invariant_result = run_invariants(manifest_after)
                if not invariant_result.get("ok"):
                    print("[StateManager] Invariant violations detected; refusing to persist critical artifact.")
                    remove_artifact(self.run_path, name)
                    if name == "enhanced_analytics":
                        for section_name in (
                            "correlation_analysis",
                            "correlation_ci",
                            "distribution_analysis",
                            "quality_metrics",
                            "business_intelligence",
                            "feature_importance",
                        ):
                            remove_artifact(self.run_path, section_name)
                    if self.redis_client:
                        try:
                            key = self._get_redis_key(name)
                            self.redis_client.delete(key)
                        except Exception:
                            pass
                    if path.exists():
                        try:
                            path.unlink()
                        except Exception:
                            pass
                    return

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

    def append(self, name: str, record: Any):
        """Append a JSON-serializable record to a list stored under `name`."""
        existing = self.read(name)
        if not isinstance(existing, list):
            existing = []
        existing.append(record)
        self.write(name, existing)

    def add_warning(self, code: str, message: str, details: Optional[dict] = None):
        """Store a run-level warning for centralized diagnostics."""
        payload = {"code": code, "message": message}
        if details:
            payload["details"] = details
        warnings = self.read("run_warnings")
        if not isinstance(warnings, list):
            warnings = []
        if any(isinstance(entry, dict) and entry.get("code") == code for entry in warnings):
            return
        warnings.append(payload)
        self.write("run_warnings", warnings)
        from core.run_manifest import add_warning
        add_warning(self.run_path, code, "warning", message)

    def get_warnings(self) -> list:
        """Return run-level warnings."""
        warnings = self.read("run_warnings")
        return warnings if isinstance(warnings, list) else []

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
