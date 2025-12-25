from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import pandas as pd

@dataclass
class ColumnMeta:
    name: str
    inferred_type: str = "unknown"
    original_types_seen: List[str] = field(default_factory=list)
    missing_ratio: float = 0.0
    sample_values: List[Any] = field(default_factory=list)

@dataclass
class AnomalyRecord:
    id: str
    table_name: str
    column_name: Optional[str]
    row_index: Optional[int]
    anomaly_type: str # missing, format_mismatch, outlier, logical_conflict, integrity_error, schema_drift, excel_artifact
    severity: str # low, medium, high
    description: str
    suggested_fix: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)
    
    # Explainability fields
    detector: Optional[str] = None      # e.g., "outlier_iqr", "referential_checker"
    rule_name: Optional[str] = None     # e.g., "outlier_iqr_global", "referential_orphan"
    explanation: Optional[str] = None   # Human-friendly explanation

@dataclass
class AnomalyResult:
    cleaned_df: pd.DataFrame
    anomalies_df: pd.DataFrame
    column_metadata: List[ColumnMeta]
    logs: List[str]
    anomalies: List[AnomalyRecord] = field(default_factory=list)

@dataclass
class MasterDataset:
    tables: Dict[str, pd.DataFrame]
    relationships: List[Dict[str, Any]] = field(default_factory=list)
    primary_table: str = "master"
    project_id: str = "default"
    integration_scores: Dict[str, float] = field(default_factory=dict)
    master_dataset_path: Optional[str] = None
