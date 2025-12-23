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

class StateManager:
    def __init__(self, run_path: str):
        self.run_path = Path(run_path)

    def write(self, name: str, data: Any):
        """
        Writes data to a JSON file in the run folder.
        """
        path = self.run_path / f"{name}.json"
        
        # Handle Pydantic models
        if hasattr(data, "model_dump"):
            data = data.model_dump()
        
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=_json_default)

    def read(self, name: str) -> Optional[Any]:
        """
        Reads data from a JSON file in the run folder.
        """
        path = self.run_path / f"{name}.json"
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def exists(self, name: str) -> bool:
        """
        Checks if a state file exists.
        """
        return (self.run_path / f"{name}.json").exists()
    
    def get_file_path(self, filename: str) -> str:
        """
        Returns the full path for a file within the run directory.
        Useful for saving non-JSON artifacts like CSVs or Markdown.
        """
        return str(self.run_path / filename)
