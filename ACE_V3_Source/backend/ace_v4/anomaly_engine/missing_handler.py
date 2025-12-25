import pandas as pd
import numpy as np
from typing import List
from .models import ColumnMeta, AnomalyRecord
import uuid

class MissingHandler:
    MISSING_TOKENS = ["NA", "N/A", "NULL", "null", "None", "", "nan", "."]

    def normalize(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Convert missing tokens to NaN.
        """
        # Replace common tokens with NaN
        df = df.replace(self.MISSING_TOKENS, np.nan)
        return df

    def detect_anomalies(self, df: pd.DataFrame, table_name: str) -> List[AnomalyRecord]:
        """
        Generate anomaly records for missing values.
        """
        anomalies = []
        for col in df.columns:
            missing_mask = df[col].isnull()
            if missing_mask.any():
                # For efficiency, maybe just log summary or sample rows
                # Logging every row might be too much for big data
                # Let's log first 5 occurrences
                indices = df.index[missing_mask].tolist()[:5]
                
                for idx in indices:
                    anomalies.append(AnomalyRecord(
                        id=str(uuid.uuid4()),
                        table_name=table_name,
                        column_name=col,
                        row_index=idx,
                        anomaly_type="missing",
                        severity="low",
                        description=f"Missing value in {col}",
                        suggested_fix="Impute with median/mode or drop"
                    ))
                    
        return anomalies
