import sys
import time
import pandas as pd
from pathlib import Path
import os

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from intake.entry import IntakeSystem
from ace_v4.anomaly_engine.engine import AnomalyEngine
from ace_v4.anomaly_engine.models import MasterDataset
from ace_v4.integration.engine import IntegrationEngine

def run_complex_test(data_dir="data/complex_pressure_test"):
    print(f"=== Starting ACE V4 Complex Pressure Test ===")
    print(f"Data Source: {data_dir}")
    
    # Cleanup old master dataset
    master_path = Path(data_dir) / "master_dataset.csv"
    if master_path.exists():
        os.remove(master_path)
    
    start_total = time.time()
    
    # --- Step 1: Intake System ---
    print("\n[Step 1] Running Intake System...")
    start_intake = time.time()
    
    intake = IntakeSystem(data_dir)
    intake_result = intake.load_input(data_dir)
    
    if "error" in intake_result:
        print(f"❌ Intake Failed: {intake_result['error']}")
        sys.exit(1)
        
    duration_intake = time.time() - start_intake
    print(f"✅ Intake Complete in {duration_intake:.2f}s")
    print(f"   Master Dataset: {intake_result['master_dataset_path']}")
    print(f"   Primary Table: {intake_result.get('primary_table')}")
    
    # Verify Fusion Depth
    # We expect columns from Users, Orders, OrderItems, AND Products
    master_df = pd.read_csv(intake_result['master_dataset_path'])
    cols = master_df.columns.tolist()
    print(f"   Fused Columns: {len(cols)}")
    
    has_user = any("email" in c for c in cols)
    has_order = any("order_date" in c for c in cols)
    has_item = any("quantity" in c for c in cols)
    has_product = any("category" in c for c in cols)
    
    print(f"   - Users (Primary): {'✅' if has_user else '❌'}")
    print(f"   - Orders (Child): {'✅' if has_order else '❌'}")
    print(f"   - OrderItems (Grandchild): {'✅' if has_item else '❌'}")
    print(f"   - Products (Lookup): {'✅' if has_product else '❌'}")
    
    if not (has_user and has_order and has_item and has_product):
        print("⚠️ Fusion Incomplete! Some levels of the Snowflake schema are missing.")
    
    # --- Step 2: Anomaly Engine ---
    print("\n[Step 2] Running Anomaly Engine...")
    start_anomaly = time.time()
    
    # Load tables manually
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
    
    duration_anomaly = time.time() - start_anomaly
    print(f"✅ Anomaly Engine Complete in {duration_anomaly:.2f}s")
    print(f"   Anomalies Found: {len(anomaly_result.anomalies_df)}")
    
    if not anomaly_result.anomalies_df.empty:
        print(anomaly_result.anomalies_df["anomaly_type"].value_counts().to_string())

    # --- Step 3: Integration Engine ---
    print("\n[Step 3] Running Integration Engine...")
    start_integration = time.time()
    
    integration_engine = IntegrationEngine(
        schema_graph={"relationships": intake_result.get("relationships", [])}
    )
    integration_issues = integration_engine.run(master_dataset)
    
    duration_integration = time.time() - start_integration
    print(f"✅ Integration Engine Complete in {duration_integration:.2f}s")
    print(f"   Integration Issues: {len(integration_issues)}")

    # --- Final Summary ---
    total_duration = time.time() - start_total
    print("\n=== Complex Pressure Test Results ===")
    print(f"Total Duration: {total_duration:.2f}s")

if __name__ == "__main__":
    run_complex_test()
