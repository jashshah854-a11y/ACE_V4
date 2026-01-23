import pandas as pd
from typing import List
from .models import ColumnMeta
from core.datetime_utils import coerce_datetime

class FormatNormalizer:
    def normalize(self, df: pd.DataFrame, metadata: List[ColumnMeta]) -> pd.DataFrame:
        """
        Normalize formats based on inferred types.
        """
        for meta in metadata:
            col = meta.name
            if meta.inferred_type == "float" or meta.inferred_type == "integer":
                # If it was inferred as numeric but stored as object (string), clean it
                if df[col].dtype == "object":
                    df[col] = self._normalize_numbers(df[col])
                    
            elif meta.inferred_type == "date":
                df[col] = self._normalize_dates(df[col])
                
        return df

    def _normalize_numbers(self, series: pd.Series) -> pd.Series:
        # Remove currency symbols and commas
        clean = series.astype(str).str.replace(r'[$,]', '', regex=True)
        return pd.to_numeric(clean, errors='coerce')

    def _normalize_dates(self, series: pd.Series) -> pd.Series:
        return coerce_datetime(series)
