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

    def read(self, name: str) -> Optional[Any]:
        """
        Reads data from Disk, falling back to Redis if missing.
        """
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

    def exists(self, name: str) -> bool:
        """
        Checks if a state file exists (Disk or Redis).
        """
        if (self.run_path / f"{name}.json").exists():
            return True
            
        if self.redis_client:
            return bool(self.redis_client.exists(self._get_redis_key(name)))
            
        return False
    
    def get_file_path(self, filename: str) -> str:
        """
        Returns the full path for a file within the run directory.
        Useful for saving non-JSON artifacts like CSVs or Markdown.
        """
        return str(self.run_path / filename)
