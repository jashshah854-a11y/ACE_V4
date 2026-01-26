import pandas as pd
from typing import List, Tuple
from .models import ColumnMeta

class TypeInferer:
    def infer_and_update(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[ColumnMeta]]:
        """
        Infer column types and update metadata.
        """
        metadata = []
        
        for col in df.columns:
            series = df[col]
            inferred_type = self._infer_column_type(series)
            
            # Normalize booleans if detected
            if inferred_type == "boolean":
                df[col] = self._normalize_booleans(series)
                
            meta = ColumnMeta(
                name=col,
                inferred_type=inferred_type,
                original_types_seen=[str(series.dtype)],
                missing_ratio=series.isnull().mean(),
                sample_values=series.dropna().head(5).tolist()
            )
            metadata.append(meta)
            
        return df, metadata

    def _infer_column_type(self, series: pd.Series) -> str:
        # 1. Boolean Check
        if self._is_boolean(series):
            return "boolean"
            
        # 2. Numeric Check
        if pd.api.types.is_numeric_dtype(series):
            if pd.api.types.is_integer_dtype(series):
                return "integer"
            return "float"
            
        # 3. Date Check (Heuristic)
        if self._is_date(series):
            return "date"
            
        # 4. Fallback
        return "string"

    def _is_boolean(self, series: pd.Series) -> bool:
        # Check if values are mostly yes/no/true/false/1/0
        unique = series.dropna().astype(str).str.lower().unique()
        if len(unique) > 3: return False
        
        valid_bools = {"yes", "no", "y", "n", "true", "false", "t", "f", "1", "0", "1.0", "0.0"}
        return all(u in valid_bools for u in unique)

    def _is_date(self, series: pd.Series) -> bool:
        # Try converting sample to date
        sample = series.dropna().head(10)
        if sample.empty: return False
        
        try:
            pd.to_datetime(sample, errors='raise', format='mixed')
            return True
        except:
            return False

    def _normalize_booleans(self, series: pd.Series) -> pd.Series:
        true_vals = {"yes", "y", "true", "t", "1", "1.0"}
        return series.astype(str).str.lower().map(lambda x: True if x in true_vals else False)
