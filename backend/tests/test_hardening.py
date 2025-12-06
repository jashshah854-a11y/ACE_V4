import sys
import os
import pandas as pd
import numpy as np
import json
from unittest.mock import MagicMock

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from agents.overseer import Overseer, build_feature_matrix
from agents.persona_engine import PersonaEngine
from core.json_utils import extract_json_block, JsonExtractionError
from core.schema import SchemaMap

def test_overseer_nan_handling():
    print("\n--- Testing Overseer NaN Handling ---")
    
    # Mock Schema Map to select all columns as numerical features
    schema_map = MagicMock()
    # We need auto_feature_groups to return all columns. 
    # Since we can't easily mock auto_feature_groups here without patching, 
    # let's patch it.
    
    from unittest.mock import patch
    
    # Case 1: Mixed NaNs
    df_mixed = pd.DataFrame({
        "A": [1.0, 2.0, np.nan, 4.0],
        "B": [np.nan, 2.0, 3.0, 4.0],
        "C": [1.0, 2.0, 3.0, 4.0]
    })
    
    print("Testing Mixed NaNs...")
    # No need to patch auto_feature_groups anymore as the new logic doesn't use it directly in the same way 
    # (it uses schema_map['columns'] which we normalize).
    # But wait, the new logic uses schema_map["columns"].
    # If we pass a list as schema_map, it handles it.
    
    X = build_feature_matrix(df_mixed, ["A", "B", "C"])
    assert not np.isnan(X.values).any(), "Result should not have NaNs"
    assert X.shape == (4, 3), "Shape should be preserved"
    print("PASSED Mixed NaNs")
    
    # Case 2: All NaN Column
    df_all_nan = pd.DataFrame({
        "A": [1.0, 2.0, 3.0],
        "B": [np.nan, np.nan, np.nan]
    })
    
    print("Testing All-NaN Column...")
    # The new logic fills NaNs with 0, so it won't drop columns.
    X = build_feature_matrix(df_all_nan, ["A", "B"])
    assert X.shape == (3, 2), "Should keep all columns and fill with 0"
    print("PASSED All-NaN Column")
    
    # Case 3: Empty Matrix (after dropping or filtering)
    df_empty = pd.DataFrame({"B": [np.nan, np.nan]})
    
    print("Testing Empty Matrix...")
    X = build_feature_matrix(df_empty, ["B"])
    assert X.shape == (2, 1), "Should keep column and fill with 0"
    print("PASSED Empty Matrix")

def test_json_extraction():
    print("\n--- Testing JSON Extraction ---")
    
    # Case 1: Clean JSON
    text1 = '{"key": "value"}'
    assert extract_json_block(text1) == {"key": "value"}
    print("PASSED Clean JSON")
    
    # Case 2: Markdown JSON
    text2 = 'Here is the json:\n```json\n{"key": "value"}\n```'
    assert extract_json_block(text2) == {"key": "value"}
    print("PASSED Markdown JSON")
    
    # Case 3: Messy Text
    text3 = 'Sure! {"key": "value"} is the answer.'
    assert extract_json_block(text3) == {"key": "value"}
    print("PASSED Messy Text")
    
    # Case 4: Invalid JSON
    text4 = '{"key": "value"' # Missing brace
    try:
        extract_json_block(text4)
        assert False, "Should have raised JsonExtractionError"
    except JsonExtractionError:
        print("PASSED Invalid JSON (Raised Error)")

def test_persona_fallback():
    print("\n--- Testing Persona Fallback ---")
    
    schema_map = SchemaMap()
    state = MagicMock()
    engine = PersonaEngine(schema_map, state)
    
    fingerprints = {
        "cluster_0": {
            "size": 100,
            "role_summaries": {"income": 90000}
        },
        "cluster_1": {
            "size": 50,
            "role_summaries": {"income": 30000}
        }
    }
    
    personas = engine._fallback_personas_from_clusters(fingerprints)
    
    assert len(personas) == 2
    assert personas[0]["label"] == "High Income"
    assert personas[1]["label"] == "Budget Conscious"
    print("PASSED Persona Fallback")

if __name__ == "__main__":
    test_overseer_nan_handling()
    test_json_extraction()
    test_persona_fallback()
    print("\nALL HARDENING TESTS PASSED")
