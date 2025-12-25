import sys
import os
import pandas as pd
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from intake.entry import IntakeSystem
from ace_v4.anomaly_engine.engine import AnomalyEngine

def create_v4_test_data():
    data_dir = Path("data/test_v4_integration")
    data_dir.mkdir(exist_ok=True, parents=True)
    
    # 1. Customers (Dirty, Duplicates)
    # Key: cust_id
    customers = pd.DataFrame({
        "cust_id": [101, 102, 103, 101], # Duplicate 101
        "name": ["Alice", "Bob", "Charlie", "Alice"],
        "joined": ["2023-01-01", "N/A", "2023-03-01", "2023-01-01"] # Missing Date
    })
    customers.to_csv(data_dir / "customers.csv", index=False)
    
    # 2. Orders (Fuzzy Key, Outliers, Format)
    # Key: client_id (Fuzzy match to cust_id)
    orders = pd.DataFrame({
        "order_id": [1, 2, 3, 4, 5],
        "client_id": [101, 101, 102, 102, 103],
        "amount": ["$100", "$50", "$1,000,000", "$20", "$300"], # Outlier ($1M), Format
        "status": ["completed", "pending", "completed", "error", "completed"]
    })
    orders.to_csv(data_dir / "orders.csv", index=False)
    
    return str(data_dir)

def test_v4_integration():
    print("=== Testing ACE V4 Integration (Intake + Anomaly) ===")
    
    # 1. Setup Data
    input_dir = create_v4_test_data()
    print(f"Created test data in: {input_dir}")
    
    # 2. Run Intake 2.0
    print("\n--- Step 1: Intake 2.0 ---")
    intake = IntakeSystem(input_dir) # Use input dir as run path for simplicity in test
    intake_result = intake.load_input(input_dir)
    
    if "error" in intake_result:
        print(f"❌ Intake Failed: {intake_result['error']}")
        return

    print(f"Primary Table: {intake_result['primary_table']}")
    print(f"Master Dataset: {intake_result['master_dataset_path']}")
    
    # Verify Fusion
    master_df = pd.read_csv(intake_result['master_dataset_path'])
    print("Fused Columns:", master_df.columns.tolist())
    if "orders_amount_sum" not in master_df.columns and "orders_amount_mean" not in master_df.columns:
         # Note: Aggregator might fail to sum strings like "$100", so it might count them or fail.
         # Let's see what happened. The Aggregator checks for numeric type.
         # Since "amount" is strings ("$100"), Aggregator likely treated it as Categorical -> nunique.
         # This is EXPECTED behavior for the current simple aggregator.
         # The Anomaly Engine comes AFTER. 
         # Ideally, we want Anomaly Engine to clean BEFORE Aggregation? 
         # Or Intake should handle basic cleaning?
         # In V4 spec, Intake fuses, then Anomaly cleans the Master.
         # But if Intake aggregates, it needs numeric values.
         # This highlights a dependency: Intake needs basic cleaning or Aggregator needs to be smarter.
         # For this test, let's see what it produced.
         pass
         
    # 3. Run Anomaly Engine
    print("\n--- Step 2: Anomaly Engine ---")
    
    # Construct MasterDataset object
    from ace_v4.anomaly_engine.models import MasterDataset
    
    # Load tables from intake result
    tables = {}
    if "tables" in intake_result:
        for name, meta in intake_result["tables"].items():
            if "path" in meta:
                tables[name] = pd.read_csv(meta["path"])
                
    master_dataset = MasterDataset(
        tables=tables,
        relationships=intake_result.get("relationships", []),
        primary_table=intake_result.get("primary_table", "master"),
        master_dataset_path=intake_result.get("master_dataset_path")
    )
    
    anomaly_engine = AnomalyEngine(master_dataset)
    anomaly_result = anomaly_engine.run()
    
    # 4. Verify Anomalies
    print("\n--- Anomalies Detected ---")
    if not anomaly_result.anomalies_df.empty:
        print(anomaly_result.anomalies_df[["anomaly_type", "column_name", "description"]].to_string())
        
        # Check specific expectations
        types = anomaly_result.anomalies_df["anomaly_type"].unique()
        
        # Expect Integrity Error (Duplicate Customer 101)
        has_integrity = "integrity_error" in types
        print(f"Integrity Check (Duplicate): {'✅' if has_integrity else '❌'}")
        
        # Expect Missing (Joined Date N/A)
        has_missing = "missing" in types
        print(f"Missing Value Check (N/A): {'✅' if has_missing else '❌'}")
        
        # Expect Outlier? 
        # If "amount" was aggregated as "nunique" (count), it might not have outliers.
        # If "cust_id" or "joined" has outliers? Unlikely.
        # So we might not see outliers if aggregation masked the raw values.
        # This is a good finding: Anomaly Engine on Master Dataset only sees AGGREGATED child data.
        # To detect outliers in child data, we might need to run Anomaly Engine on raw tables BEFORE Intake?
        # Or Anomaly Engine should run on the Master, which is correct for "Customer Level" anomalies.
        
    else:
        print("❌ No anomalies found.")

if __name__ == "__main__":
    test_v4_integration()
