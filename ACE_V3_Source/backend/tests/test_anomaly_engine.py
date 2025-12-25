import sys
import os
import pandas as pd
import numpy as np
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from ace_v4.anomaly_engine.engine import AnomalyEngine

def create_dirty_data():
    data_dir = Path("data/test_anomaly")
    data_dir.mkdir(exist_ok=True, parents=True)
    
    df = pd.DataFrame({
        "id": [1, 2, 3, 4, 1], # Duplicate ID
        "name": ["Alice", "Bob", "Charlie", "David", "Alice"], # Duplicate Row
        "age": [25, 30, 150, "N/A", 25], # Outlier (150), Missing (N/A)
        "salary": ["$50,000", "$60,000", "$70,000", "$80,000", "$50,000"], # Format (Currency)
        "is_active": ["yes", "no", "true", "0", "yes"], # Boolean
        "joined_date": ["2023-01-01", "01/02/2023", "2023-03-01", "2023-04-01", "2023-01-01"] # Mixed Dates
    })
    
    path = data_dir / "master_dataset.csv"
    df.to_csv(path, index=False)
    
    return {
        "master_dataset_path": str(path),
        "primary_table": "employees"
    }

def test_anomaly_engine():
    print("=== Testing ACE V4 Anomaly Engine ===")
    
    # Setup Data
    intake_result = create_dirty_data()
    print(f"Created dirty data at: {intake_result['master_dataset_path']}")
    
    # Run Engine
    engine = AnomalyEngine()
    try:
        result = engine.run(intake_result)
        
        print("\n--- Cleaned Data Preview ---")
        print(result.cleaned_df.head())
        print(result.cleaned_df.dtypes)
        
        print("\n--- Anomalies Found ---")
        if not result.anomalies_df.empty:
            print(result.anomalies_df[["anomaly_type", "column_name", "description"]].to_string())
        else:
            print("No anomalies found (Unexpected!)")
            
        # Assertions
        print("\n--- Verification ---")
        
        # 1. Type Inference
        age_meta = next(m for m in result.column_metadata if m.name == "age")
        print(f"Age inferred type: {age_meta.inferred_type} (Expected: integer/float)")
        
        active_meta = next(m for m in result.column_metadata if m.name == "is_active")
        print(f"Is_active inferred type: {active_meta.inferred_type} (Expected: boolean)")
        
        # 2. Format Normalization
        salary_type = result.cleaned_df["salary"].dtype
        print(f"Salary cleaned type: {salary_type} (Expected: int/float)")
        
        # 3. Missing Handling
        missing_count = result.anomalies_df[result.anomalies_df["anomaly_type"] == "missing"].shape[0]
        print(f"Missing anomalies: {missing_count} (Expected: >= 1)")
        
        # 4. Integrity
        integrity_count = result.anomalies_df[result.anomalies_df["anomaly_type"] == "integrity_error"].shape[0]
        print(f"Integrity anomalies: {integrity_count} (Expected: >= 2)") # Row dupe + Key dupe
        
        # 5. Outliers
        outlier_count = result.anomalies_df[result.anomalies_df["anomaly_type"] == "outlier"].shape[0]
        print(f"Outlier anomalies: {outlier_count} (Expected: >= 1)") # Age 150
        
        if missing_count >= 1 and integrity_count >= 2 and outlier_count >= 1:
             print("\n✅ SUCCESS: All anomaly types detected.")
        else:
             print("\n❌ FAILURE: Some anomalies missed.")

    except Exception as e:
        print(f"\n❌ CRASH: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_anomaly_engine()
