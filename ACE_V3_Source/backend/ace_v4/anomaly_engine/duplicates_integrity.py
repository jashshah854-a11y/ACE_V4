import pandas as pd
from typing import List
from .models import AnomalyRecord
import uuid

class DuplicatesIntegrityChecker:
    def run(self, df: pd.DataFrame, table_name: str, key_column: str = None) -> List[AnomalyRecord]:
        anomalies = []
        
        # 1. Full Row Duplicates
        dupes = df[df.duplicated(keep=False)]
        if not dupes.empty:
            # Group by all columns to identify sets
            # Just log the first few
            indices = dupes.index.tolist()[:5]
            for idx in indices:
                anomalies.append(AnomalyRecord(
                    id=str(uuid.uuid4()),
                    table_name=table_name,
                    column_name=None,
                    row_index=idx,
                    anomaly_type="integrity_error",
                    severity="medium",
                    description="Duplicate row detected",
                    suggested_fix="Remove duplicates"
                ))
                
        # 2. Key Duplicates
        if key_column and key_column in df.columns:
            key_dupes = df[df.duplicated(subset=[key_column], keep=False)]
            if not key_dupes.empty:
                indices = key_dupes.index.tolist()[:5]
                for idx in indices:
                    val = df.at[idx, key_column]
                    anomalies.append(AnomalyRecord(
                        id=str(uuid.uuid4()),
                        table_name=table_name,
                        column_name=key_column,
                        row_index=idx,
                        anomaly_type="integrity_error",
                        severity="high",
                        description=f"Duplicate key value: {val}",
                        suggested_fix="Ensure uniqueness or re-key"
                    ))
                    
        return anomalies
