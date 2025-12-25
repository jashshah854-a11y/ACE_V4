from typing import Dict, List, Optional
import pandas as pd


ROLE_GROUPS = {
    "core_numeric": [
        "income_like",
        "spend_like",
        "balance_like",
        "credit_limit_like",
        "debt_like",
        "volatility_like",
        "frequency_like",
        "recency_like",
        "tenure_like"
    ]
}

def get_feature_columns(df: pd.DataFrame, schema_map: Dict) -> List[str]:
    selected = set()
    roles = schema_map.get("semantic_roles") or {}
    for group_name, group_roles in ROLE_GROUPS.items():
        for role in group_roles:
            for col in roles.get(role, []):
                if col in df.columns:
                    selected.add(col)
    return list(selected)

def get_role_columns(schema_map: Dict, role: str) -> List[str]:
    """
    Returns all columns that the schema map marks for a given role.
    Adjust the access paths to match your real schema structure.
    """
    roles = schema_map.get("semantic_roles") or schema_map.get("roles") or {}
    cols = roles.get(role, [])
    # normalise to simple list of strings
    if isinstance(cols, dict):
        cols = cols.get("columns", [])
    return [c for c in cols if isinstance(c, str)]

def pick_first_role_column(df: pd.DataFrame, schema_map: Dict, role: str) -> Optional[str]:
    """
    Returns the first column in the dataframe that matches the role.
    If nothing matches, returns None.
    """
    for col in get_role_columns(schema_map, role):
        if col in df.columns:
            return col
    return None
