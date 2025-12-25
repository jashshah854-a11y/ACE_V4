# core/auto_features.py
import pandas as pd
from typing import Dict, List

def auto_feature_groups(df: pd.DataFrame, schema_map: Dict) -> Dict[str, List[str]]:
    groups = {}

    role_groups = schema_map.get("semantic_roles", {})
    # Handle if schema_map is a Pydantic model (though usually it's dict here)
    if hasattr(role_groups, "model_dump"):
        role_groups = role_groups.model_dump()

    for role, cols in role_groups.items():
        cols = [c for c in cols if c in df.columns]
        if cols:
            groups[role] = cols

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    unmatched = [c for c in numeric_cols if not any(c in cols for cols in groups.values())]

    if unmatched:
        groups["generic_numeric"] = unmatched

    return groups
