from typing import List, Dict, Any
import pandas as pd

class IntakeRelationships:
    def detect(self, tables: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect relationships between tables based on shared keys and cardinality.
        """
        relationships = []
        
        # Load all dataframes to check cardinality (optimization: could do this during load)
        dfs = {}
        for t in tables:
            try:
                dfs[t["name"]] = pd.read_csv(t["path"])
            except:
                continue
                
        for i, parent in enumerate(tables):
            for j, child in enumerate(tables):
                if i == j: continue
                
                # Find shared columns (Fuzzy)
                from .utils import fuzzy_match_key
                
                # Check each parent column against child columns
                for p_col in parent["columns"]:
                    # Skip noise
                    if p_col.lower() in ["date", "name", "type", "status", "index"]:
                        continue
                        
                    match = fuzzy_match_key(p_col, child["columns"])
                    if match:
                        # Check cardinality
                        p_df = dfs.get(parent["name"])
                        c_df = dfs.get(child["name"])
                        
                        if p_df is None or c_df is None: continue
                        if p_col not in p_df.columns or match not in c_df.columns: continue
                        
                        # Parent key must be unique (Primary Key)
                        if p_df[p_col].is_unique:
                            rel = {
                                "parent": parent["name"],
                                "child": child["name"],
                                "parent_key": p_col,
                                "child_key": match,
                                "relationship": "one_to_many"
                            }
                            relationships.append(rel)
                        
        return relationships
