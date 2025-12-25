from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any

@dataclass
class TableNode:
    name: str
    role: str  # "dimension", "fact", "summary", "bridge"
    key_columns: List[str]
    columns: List[str]
    row_count: int
    source_tag: Optional[str] = None


@dataclass
class RelationshipEdge:
    parent_table: str
    child_table: str
    parent_key: str
    child_key: str
    cardinality_estimate: Optional[str] = None  # "one_to_many", "many_to_many"
    join_coverage: Optional[float] = None      # filled later


@dataclass
class IntegrationIssue:
    issue_type: str              # "referential_integrity", "value_conflict", etc
    severity: str                # "low", "medium", "high"
    description: str
    tables_involved: List[str]
    key_column: Optional[str] = None
    metric: Optional[float] = None            # e.g. orphan_rate
    sample_keys: List[str] = field(default_factory=list)
    context: Dict = field(default_factory=dict)
