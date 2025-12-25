import pandas as pd
from typing import Dict, Any

class IntakeValidator:
    def validate_fusion(self, pre_df: pd.DataFrame, post_df: pd.DataFrame, primary_key: str) -> Dict[str, Any]:
        """
        Validate the integrity of the fused dataset.
        """
        report = {
            "pre_rows": len(pre_df),
            "post_rows": len(post_df),
            "row_diff": len(post_df) - len(pre_df),
            "warnings": []
        }
        
        # Check row count stability (should match primary table)
        if len(post_df) != len(pre_df):
            # This might happen if we did an inner join instead of left, or duplicates
            if len(post_df) < len(pre_df):
                report["warnings"].append(f"Row count dropped by {len(pre_df) - len(post_df)} rows.")
            else:
                report["warnings"].append(f"Row count increased by {len(post_df) - len(pre_df)} rows (possible duplicates).")
                
        # Check for nulls in key
        if post_df[primary_key].isnull().sum() > 0:
            report["warnings"].append(f"Primary key {primary_key} has null values after fusion.")
            
        return report
