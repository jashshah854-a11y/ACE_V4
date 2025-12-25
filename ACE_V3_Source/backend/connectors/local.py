from __future__ import annotations

import shutil
from pathlib import Path
from typing import Dict

from .base import ConnectorResult, SourceConnector, ensure_output_path


class LocalFileConnector(SourceConnector):
    """Pick the newest file from a directory (optionally matching glob pattern)."""

    def pull(self) -> ConnectorResult:
        directory = Path(self.options.get('path', '.')).expanduser().resolve()
        pattern = self.options.get('pattern') or '*'
        if not directory.exists() or not directory.is_dir():
            raise FileNotFoundError(f"Local connector path not found: {directory}")

        files = sorted(directory.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
        if not files:
            raise FileNotFoundError(f"No files matching {pattern} in {directory}")

        source_file = files[0]
        target_dir = Path(self.options.get('output_dir', 'data/uploads/connectors')).resolve()
        target_path = ensure_output_path(target_dir, self.name, source_file.name)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_file, target_path)
        metadata: Dict[str, str] = {
            'source_path': str(source_file),
            'pattern': pattern,
        }
        return ConnectorResult(file_path=target_path, metadata=metadata, connector_name=self.name)
