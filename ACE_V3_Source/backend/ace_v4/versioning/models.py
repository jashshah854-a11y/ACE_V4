from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime


@dataclass
class DatasetSnapshot:
    snapshot_id: str
    project_id: str
    created_at: str  # ISO string
    schema_signature: Dict[str, Dict[str, str]]  # table -> column -> type
    table_row_counts: Dict[str, int]            # table -> count
    data_hash: str                              # global hash for change detection
    source_paths: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    notes: Optional[str] = None
    anomaly_summary: Dict[str, int] = field(default_factory=dict)
    extra_meta: Dict = field(default_factory=dict)


@dataclass
class ChangeRecord:
    project_id: str
    snapshot_id: str
    previous_snapshot_id: Optional[str]
    change_type: str          # "schema_added_column", "schema_removed_column", "schema_type_change"
                              # "row_count_change", "anomaly_change"
    severity: str             # "low", "medium", "high"
    description: str
    context: Dict = field(default_factory=dict)
