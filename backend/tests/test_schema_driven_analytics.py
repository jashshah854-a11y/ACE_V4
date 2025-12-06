import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pandas as pd
import numpy as np
from core.analytics import add_risk_features

def test_add_risk_features():
    # Setup Mock Data
    df = pd.DataFrame({
        "income": [10000, 20000, 0],
        "spend": [5000, 18000, 100],
        "limit": [10000, 20000, 1000],
        "debt": [2000, 5000, 0],
        "volatility": [100, 500, 10]
    })

    # 1. Full Schema Map
    schema_map_full = {
        "semantic_roles": {
            "income_like": ["income"],
            "spend_like": ["spend"],
            "credit_limit_like": ["limit"],
            "debt_like": ["debt"],
            "volatility_like": ["volatility"]
        }
    }

    print("Testing Full Schema...")
    df_res = add_risk_features(df, schema_map_full)
    
    assert "savings_rate" in df_res.columns
    assert "utilization" in df_res.columns
    assert "debt_ratio" in df_res.columns
    assert "volatility_risk" in df_res.columns
    assert "risk_score" in df_res.columns
    
    print("Full Schema Results:")
    print(df_res[["savings_rate", "utilization", "debt_ratio", "risk_score"]])
    print("PASSED Full Schema\n")

    # 2. Partial Schema (Missing Debt and Volatility)
    schema_map_partial = {
        "semantic_roles": {
            "income_like": ["income"],
            "spend_like": ["spend"],
            "credit_limit_like": ["limit"]
        }
    }

    print("Testing Partial Schema...")
    df_res_partial = add_risk_features(df, schema_map_partial)
    
    assert "savings_rate" in df_res_partial.columns
    assert "utilization" in df_res_partial.columns
    assert "debt_ratio" not in df_res_partial.columns
    assert "volatility_risk" not in df_res_partial.columns
    assert "risk_score" in df_res_partial.columns
    
    print("Partial Schema Results:")
    print(df_res_partial[["savings_rate", "utilization", "risk_score"]])
    print("PASSED Partial Schema\n")

    # 3. Missing Columns in DF (Schema says they exist, but DF doesn't have them)
    # This simulates data drift or wrong schema
    df_missing = df.drop(columns=["income"])
    
    print("Testing Missing Columns in DF...")
    df_res_missing = add_risk_features(df_missing, schema_map_full)
    
    # income_like points to "income", but "income" is not in DF.
    # pick_first_role_column should return None.
    # So savings_rate (depends on income) should NOT be calculated.
    
    assert "savings_rate" not in df_res_missing.columns
    assert "utilization" in df_res_missing.columns # spend and limit still exist
    assert "risk_score" in df_res_missing.columns
    
    print("Missing Columns Results:")
    print(df_res_missing[["utilization", "risk_score"]])
    print("PASSED Missing Columns in DF\n")

    print("ALL TESTS PASSED")

if __name__ == "__main__":
    test_add_risk_features()
