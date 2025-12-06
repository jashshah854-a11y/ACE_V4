# core/data_quality.py
import pandas as pd

def compute_data_quality(df: pd.DataFrame):
    if df.empty:
        return 0.0
        
    null_ratio = df.isna().mean().mean()
    duplicate_ratio = df.duplicated().mean()
    
    # Avoid division by zero if no columns
    if df.shape[1] == 0:
        numeric_ratio = 0
    else:
        numeric_ratio = df.select_dtypes(include="number").shape[1] / df.shape[1]

    score = (
        (1 - null_ratio) * 0.5 +
        (1 - duplicate_ratio) * 0.2 +
        numeric_ratio * 0.3
    )

    return round(score, 3)
