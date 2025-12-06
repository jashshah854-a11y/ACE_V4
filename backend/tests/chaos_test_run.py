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

def run_chaos_test(data_dir="data/chaos_test"):
    print(f"=== Starting ACE V4 Chaos Spectrum Test ===")
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
    try:
        intake_result = intake.load_input(data_dir)
    except Exception as e:
        print(f"❌ Intake Crashed: {e}")
        sys.exit(1)
    
    if "error" in intake_result:
        print(f"❌ Intake Failed: {intake_result['error']}")
        sys.exit(1)
        
    duration_intake = time.time() - start_intake
    print(f"✅ Intake Complete in {duration_intake:.2f}s")
    print(f"   Master Dataset: {intake_result.get('master_dataset_path')}")
    
    # Verify Schema Inference (JSON)
    if "tables" in intake_result:
        for name, meta in intake_result["tables"].items():
            if "drifting_logs" in name:
                print(f"   Log Schema Columns: {len(meta.get('columns', []))}")
                print(f"   - Latency found: {'latency' in meta.get('columns', [])}")
                print(f"   - Metadata.ip found: {'metadata_ip' in meta.get('columns', []) or 'metadata.ip' in meta.get('columns', [])}")
    
    # --- Step 2: Anomaly Engine ---
    print("\n[Step 2] Running Anomaly Engine...")
    start_anomaly = time.time()
    
    # Load tables manually
    tables = {}
    if "tables" in intake_result:
        for name, meta in intake_result["tables"].items():
            if "path" in meta:
                try:
                    tables[name] = pd.read_csv(meta["path"])
                except Exception as e:
                    print(f"⚠️ Failed to load table {name}: {e}")
                
    master_dataset = MasterDataset(
        tables=tables,
        relationships=intake_result.get("relationships", []),
        primary_table=intake_result.get("primary_table", "master"),
        master_dataset_path=intake_result.get("master_dataset_path")
    )
    
    anomaly_engine = AnomalyEngine(master_dataset)
    try:
        anomaly_result = anomaly_engine.run()
    except Exception as e:
        print(f"❌ Anomaly Engine Crashed: {e}")
        sys.exit(1)
    
    duration_anomaly = time.time() - start_anomaly
    print(f"✅ Anomaly Engine Complete in {duration_anomaly:.2f}s")
    print(f"   Anomalies Found: {len(anomaly_result.anomalies_df)}")
    
    if not anomaly_result.anomalies_df.empty:
        print(anomaly_result.anomalies_df["anomaly_type"].value_counts().to_string())

    # --- Final Summary ---
    total_duration = time.time() - start_total
    print("\n=== Chaos Spectrum Test Results ===")
    print(f"Total Duration: {total_duration:.2f}s")

if __name__ == "__main__":
    run_chaos_test()
