import json
import os
from typing import List, Dict, Optional, Any

import pandas as pd

from .models import DatasetSnapshot
from .utils import now_iso, hash_tables


class VersionStore:
    def __init__(self, base_dir: str = ".ace_versions"):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    def _project_dir(self, project_id: str) -> str:
        d = os.path.join(self.base_dir, project_id)
        os.makedirs(d, exist_ok=True)
        return d

    def _snapshot_path(self, project_id: str, snapshot_id: str) -> str:
        return os.path.join(self._project_dir(project_id), f"{snapshot_id}.json")

    def list_snapshots(self, project_id: str) -> List[DatasetSnapshot]:
        project_dir = self._project_dir(project_id)
        snapshots: List[DatasetSnapshot] = []

        if not os.path.exists(project_dir):
            return []

        for fname in sorted(os.listdir(project_dir)):
            if not fname.endswith(".json"):
                continue
            path = os.path.join(project_dir, fname)
            with open(path, "r", encoding="utf8") as f:
                data = json.load(f)
            snapshots.append(DatasetSnapshot(**data))

        return snapshots

    def get_latest_snapshot(self, project_id: str) -> Optional[DatasetSnapshot]:
        snaps = self.list_snapshots(project_id)
        if not snaps:
            return None
        # sorted by file name which can be snapshot id or timestamp based
        return snaps[-1]

    def create_snapshot(
        self,
        project_id: str,
        tables: Dict[str, Any],
        schema_signature: Dict[str, Dict[str, str]],
        source_paths: List[str],
        anomaly_summary: Dict[str, int] = None,
        tags: List[str] = None,
        notes: str = None,
        extra_meta: Dict = None,
    ) -> DatasetSnapshot:
        anomaly_summary = anomaly_summary or {}
        tags = tags or []
        extra_meta = extra_meta or {}

        table_row_counts = {name: int(len(df)) for name, df in tables.items()}
        data_hash = hash_tables(tables)

        snapshot_id = data_hash[:12]

        snapshot = DatasetSnapshot(
            snapshot_id=snapshot_id,
            project_id=project_id,
            created_at=now_iso(),
            schema_signature=schema_signature,
            table_row_counts=table_row_counts,
            data_hash=data_hash,
            source_paths=source_paths,
            tags=tags,
            notes=notes,
            anomaly_summary=anomaly_summary,
            extra_meta=extra_meta,
        )

        path = self._snapshot_path(project_id, snapshot_id)
        with open(path, "w", encoding="utf8") as f:
            json.dump(snapshot.__dict__, f, indent=2, sort_keys=True)

        return snapshot
