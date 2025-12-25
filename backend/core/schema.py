from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any, Union

class DatasetInfo(BaseModel):
    name: str = ""
    path: str = ""
    row_count: int = 0
    column_count: int = 0
    sample_rows: List[Dict[str, Any]] = Field(default_factory=list)

class BasicTypes(BaseModel):
    numeric: List[str] = Field(default_factory=list)
    categorical: List[str] = Field(default_factory=list)
    datetime: List[str] = Field(default_factory=list)
    text: List[str] = Field(default_factory=list)

class ColumnStats(BaseModel):
    mean: Optional[float] = None
    median: Optional[float] = None
    std: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    skew: Optional[float] = None
    missing_rate: Optional[float] = None

class SemanticRoles(BaseModel):
    id_fields: List[str] = Field(default_factory=list)
    time_fields: List[str] = Field(default_factory=list)
    
    income_like: List[str] = Field(default_factory=list)
    spend_like: List[str] = Field(default_factory=list)
    risk_like: List[str] = Field(default_factory=list)
    value_like: List[str] = Field(default_factory=list)
    activity_like: List[str] = Field(default_factory=list)
    frequency_like: List[str] = Field(default_factory=list)
    volume_like: List[str] = Field(default_factory=list)
    demographic_like: List[str] = Field(default_factory=list)
    
    categorical_descriptors: List[str] = Field(default_factory=list)

class RoleConfidence(BaseModel):
    income_like: float = 0.0
    spend_like: float = 0.0
    risk_like: float = 0.0
    value_like: float = 0.0
    activity_like: float = 0.0
    frequency_like: float = 0.0
    volume_like: float = 0.0
    demographic_like: float = 0.0

class DomainGuess(BaseModel):
    domain: str = ""
    confidence: float = 0.0

class FeatureQuality(BaseModel):
    variance_score: float = 0.0
    missing_score: float = 0.0
    distribution_score: float = 0.0
    overall_quality: float = 0.0

class Relationships(BaseModel):
    correlations: Dict[str, Dict[str, float]] = Field(default_factory=dict)
    strong_pairs: List[List[str]] = Field(default_factory=list)

class FeaturePlan(BaseModel):
    clustering_features: List[str] = Field(default_factory=list)
    persona_features: List[str] = Field(default_factory=list)
    risk_features: List[str] = Field(default_factory=list)
    value_features: List[str] = Field(default_factory=list)
    anomaly_features: List[str] = Field(default_factory=list)

class Warnings(BaseModel):
    missing_numeric: bool = False
    low_row_count: bool = False
    suspected_data_issues: List[str] = Field(default_factory=list)

class SchemaMap(BaseModel):
    """
    The Official ACE V3 Schema Map Contract.
    This object defines the single source of truth for any dataset ingested by ACE.
    """
    dataset_info: DatasetInfo = Field(default_factory=DatasetInfo)
    basic_types: BasicTypes = Field(default_factory=BasicTypes)
    stats: Dict[str, ColumnStats] = Field(default_factory=dict)
    semantic_roles: SemanticRoles = Field(default_factory=SemanticRoles)
    role_confidence: RoleConfidence = Field(default_factory=RoleConfidence)
    domain_guess: DomainGuess = Field(default_factory=DomainGuess)
    feature_quality_scores: Dict[str, FeatureQuality] = Field(default_factory=dict)
    relationships: Relationships = Field(default_factory=Relationships)
    normalization_plan: Dict[str, str] = Field(default_factory=dict)
    feature_plan: FeaturePlan = Field(default_factory=FeaturePlan)
    warnings: Warnings = Field(default_factory=Warnings)


def ensure_schema_map(data: Optional[Union["SchemaMap", Dict[str, Any]]]) -> SchemaMap:
    """Coerce persisted schema payloads into a SchemaMap instance."""
    if isinstance(data, SchemaMap):
        return data
    if isinstance(data, dict):
        try:
            return SchemaMap(**data)
        except Exception:
            return SchemaMap()
    return SchemaMap()

