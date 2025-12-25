import pandas as pd
from typing import Dict, List, Any

class IntelligentAggregator:
    def get_rules(self, df: pd.DataFrame, group_key: str) -> Dict[str, Any]:
        """
        Generate aggregation rules for a dataframe.
        """
        rules = {}
        
        for col in df.columns:
            if col == group_key: continue
            
            col_lower = str(col).lower()
            
            # Numeric columns
            if pd.api.types.is_numeric_dtype(df[col]):
                # Heuristics for aggregation type
                if any(x in col_lower for x in ["amount", "price", "cost", "revenue", "sales", "spend"]):
                    rules[col] = ["sum", "mean"]
                elif any(x in col_lower for x in ["count", "num", "quantity", "freq"]):
                    rules[col] = ["sum", "mean"]
                elif any(x in col_lower for x in ["rate", "ratio", "percent", "score", "age"]):
                    rules[col] = ["mean", "median"]
                else:
                    # Default numeric
                    rules[col] = ["mean"]
                    
            # Categorical / String columns
            else:
                # For categoricals, we usually want count distinct or mode (top)
                rules[col] = "nunique"
                
        return rules
