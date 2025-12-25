from __future__ import annotations

import abc
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional


def ensure_output_path(base_dir: Path, connector: str, filename: str) -> Path:
    base_dir.mkdir(parents=True, exist_ok=True)
    safe_name = filename.replace('..', '_').replace('/', '_')
    return base_dir / connector / safe_name


@dataclass
class ConnectorResult:
    file_path: Path
    metadata: Dict[str, Any] = field(default_factory=dict)
    connector_name: Optional[str] = None


class SourceConnector(abc.ABC):
    def __init__(self, name: str, options: Dict[str, Any]):
        self.name = name
        self.options = options or {}

    @abc.abstractmethod
    def pull(self) -> ConnectorResult:
        """Download/prepare a dataset and return the local path."""

    def describe(self) -> Dict[str, Any]:
        return {"name": self.name, "type": self.__class__.__name__, "options": self.options}

    def cleanup(self) -> None:
        """Optional resource cleanup."""
        return None
