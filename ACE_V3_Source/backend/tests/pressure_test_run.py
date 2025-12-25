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

def get_memory_usage():
    # Placeholder since psutil is missing
    return 0.0

def run_pressure_test(data_dir="data/pressure_test"):
    print(f"=== Starting ACE V4 Pressure Test ===")
    print(f"Data Source: {data_dir}")
    
    # Cleanup old master dataset
    master_path = Path(data_dir) / "master_dataset.csv"
    if master_path.exists():
        os.remove(master_path)
        print(f"Deleted old master dataset: {master_path}")
    
    start_total = time.time()
    
    # --- Step 1: Intake System ---
    print("\n[Step 1] Running Intake System...")
    start_intake = time.time()
    mem_start = get_memory_usage()
    
    intake = IntakeSystem(data_dir)
    intake_result = intake.load_input(data_dir)
    
    if "error" in intake_result:
        print(f"❌ Intake Failed: {intake_result['error']}")
        sys.exit(1)
        
    duration_intake = time.time() - start_intake
    mem_intake = get_memory_usage()
    print(f"✅ Intake Complete in {duration_intake:.2f}s")
    print(f"   Memory Delta: {mem_intake - mem_start:.2f} MB")
    print(f"   Master Dataset: {intake_result['master_dataset_path']}")
    
    # --- Step 2: Anomaly Engine ---
    print("\n[Step 2] Running Anomaly Engine...")
    start_anomaly = time.time()
    
    # Load tables manually to construct MasterDataset (simulating real flow)
    tables = {}
    if "tables" in intake_result:
        for name, meta in intake_result["tables"].items():
            if "path" in meta:
                # Reading CSVs again to simulate memory load of loading into engine
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
    mem_anomaly = get_memory_usage()
    print(f"✅ Anomaly Engine Complete in {duration_anomaly:.2f}s")
    print(f"   Memory Delta: {mem_anomaly - mem_intake:.2f} MB")
    print(f"   Anomalies Found: {len(anomaly_result.anomalies_df)}")
    
    # Breakdown of anomalies
    if not anomaly_result.anomalies_df.empty:
        print(anomaly_result.anomalies_df["anomaly_type"].value_counts().to_string())
        
    # --- Step 3: Integration Engine ---
    print("\n[Step 3] Running Integration Engine...")
    start_integration = time.time()
    
    # Integration Engine needs schema graph (relationships)
    # And master dataset (tables)
    integration_engine = IntegrationEngine(
        schema_graph={"relationships": intake_result.get("relationships", [])}
    )
    
    # Pass the master_dataset object (or dict structure it expects)
    # The engine.run() expects a MasterDataset object or similar structure?
    # Let's check the signature. It expects 'master_dataset'.
    integration_issues = integration_engine.run(master_dataset)
    
    duration_integration = time.time() - start_integration
    mem_integration = get_memory_usage()
    print(f"✅ Integration Engine Complete in {duration_integration:.2f}s")
    print(f"   Memory Delta: {mem_integration - mem_anomaly:.2f} MB")
    print(f"   Integration Issues: {len(integration_issues)}")
    
    for issue in integration_issues[:5]:
        print(f"   - {issue.description}")
    if len(integration_issues) > 5:
        print(f"   ... and {len(integration_issues) - 5} more")

    # --- Final Summary ---
    total_duration = time.time() - start_total
    print("\n=== Pressure Test Results ===")
    print(f"Total Duration: {total_duration:.2f}s")
    print(f"Peak Memory: {get_memory_usage():.2f} MB")
    
    if total_duration < 120:
        print("✅ Performance Target Met (<120s)")
    else:
        print("⚠️ Performance Target Missed (>120s)")
        
    if len(anomaly_result.anomalies_df) > 1000:
         print("✅ Anomaly Detection Effective")
    else:
         print("⚠️ Low Anomaly Count (Check Generator)")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        run_pressure_test(sys.argv[1])
    else:
        run_pressure_test()
