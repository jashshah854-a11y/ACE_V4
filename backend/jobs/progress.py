import json
from pathlib import Path
from typing import Any, Dict


class ProgressTracker:
    """
    Lightweight progress/state writer to avoid corrupting files on crash.
    """

    def __init__(self, run_path: str):
        self.path = Path(run_path) / "progress.json"
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def _load(self) -> Dict[str, Any]:
        if not self.path.exists():
            return {}
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def _save(self, data: Dict[str, Any]):
        tmp = self.path.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        tmp.replace(self.path)

    def update(self, section: str, payload: Dict[str, Any]):
        data = self._load()
        section_data = data.get(section, {})
        section_data.update(payload)
        data[section] = section_data
        self._save(data)

    def read(self) -> Dict[str, Any]:
        return self._load()

