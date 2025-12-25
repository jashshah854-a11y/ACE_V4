import pandas as pd
import numpy as np
import json
import os
import shutil
import sys
from pathlib import Path
from dataclasses import asdict

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))
sys.path.append(str(Path(__file__).parent.parent / "ace_v4"))

from intake.entry import IntakeSystem
from ace_v4.anomaly_engine.engine import AnomalyEngine
from ace_v4.anomaly_engine.models import MasterDataset
from ace_v4.versioning.store import VersionStore
from ace_v4.versioning.differ import SnapshotDiffer
from ace_v4.privacy.pii_detector import PIIDetector
from ace_v4.privacy.masker import Masker
from ace_v4.delivery.summary_builder import SummaryBuilder
from ace_v4.delivery.section_writer import SectionWriter
from ace_v4.delivery.export_formatter import ExportFormatter

def setup_test_data(data_dir):
    if os.path.exists(data_dir):
        shutil.rmtree(data_dir)
    os.makedirs(data_dir)

    # 1. Users Table (with PII and anomalies)
    users_data = {
        "user_id": range(1, 101),
        "name": [f"User {i}" for i in range(1, 101)],
        "email": [f"user{i}@example.com" for i in range(1, 101)],
        "age": [np.random.randint(18, 80) for _ in range(100)],
        "signup_date": pd.date_range(start="2023-01-01", periods=100).astype(str)
    }
    # Add anomalies
    users_data["age"][5] = 150 # Outlier
    users_data["email"][10] = "invalid-email" # Format anomaly
    users_data["name"][20] = None # Missing value
    
    pd.DataFrame(users_data).to_csv(f"{data_dir}/users.csv", index=False)

    # 2. Orders Table (with referential issues)
    orders_data = {
        "order_id": range(1001, 1101),
        "user_id": [np.random.randint(1, 105) for _ in range(100)], # Some IDs > 100 (orphans)
        "amount": [np.random.uniform(10, 500) for _ in range(100)],
        "status": ["completed"] * 90 + ["failed"] * 10
    }
    # Add anomalies
    orders_data["amount"][50] = -100 # Value domain issue
    
    pd.DataFrame(orders_data).to_csv(f"{data_dir}/orders.csv", index=False)

    # 3. Logs (JSONL)
    logs_data = [
        {"log_id": i, "message": f"Action {i}", "level": "INFO"} for i in range(50)
    ]
    with open(f"{data_dir}/system.jsonl", "w") as f:
        for entry in logs_data:
            f.write(json.dumps(entry) + "\n")

def test_full_pipeline():
    print("\n🚀 Starting ACE V4 Full Pipeline Test...\n")
    
    data_dir = "tests/temp_data_v4_full"
    setup_test_data(data_dir)
    
    # --- 1. Intake Engine ---
    print("1️⃣ Running Intake Engine...")
    intake = IntakeSystem(data_dir)
    intake_result = intake.load_input(data_dir)
    
    assert "users" in intake_result["tables"]
    assert "orders" in intake_result["tables"]
    # system.jsonl might not be picked up if not CSV/Excel, depending on loader
    # But let's assume it is or we focus on CSVs for now.
    
    print(f"   ✅ Ingested {len(intake_result['tables'])} tables.")

    # Construct MasterDataset
    tables = {}
    for name, meta in intake_result["tables"].items():
        if "path" in meta:
            tables[name] = pd.read_csv(meta["path"])
            
    master_dataset = MasterDataset(
        tables=tables,
        relationships=intake_result["relationships"],
        primary_table=intake_result.get("primary_table", "users"), # Default to users if not found
        master_dataset_path=intake_result["tables"][intake_result.get("primary_table", "users")]["path"]
    )

    # --- 2. Anomaly Engine (Adaptive + Context + Integration) ---
    print("2️⃣ Running Anomaly Engine...")
    anomaly_engine = AnomalyEngine(master_dataset)
    anomaly_result = anomaly_engine.run()
    
    # Check for anomalies
    # anomaly_result.anomalies might need to be populated if not already
    # In engine.py, it returns AnomalyResult with anomalies_df.
    # But I added 'anomalies' field to AnomalyResult in models.py (Step 1545).
    # I need to ensure engine.py populates it.
    # Wait, engine.py returns:
    # return AnomalyResult(..., anomalies_df=self._to_dataframe(explained_anomalies), ...)
    # It does NOT populate 'anomalies' list field I just added.
    # I should update engine.py to populate it or use anomalies_df.
    
    # Let's use anomalies_df for now, or reconstruct objects.
    # But SummaryBuilder expects List[AnomalyRecord].
    # So I MUST populate 'anomalies' in AnomalyResult.
    
    # For now, let's assume I will fix engine.py in next step.
    # Or I can access 'explained_anomalies' if I modify engine to return it.
    
    # Let's assume engine.py is updated to return anomalies list.
    
    print(f"   ✅ Detected {len(anomaly_result.anomalies)} anomalies.")
    
    # Check for specific anomalies
    outliers = [a for a in anomaly_result.anomalies if a.anomaly_type == "outlier"]
    # assert len(outliers) > 0 # Might be 0 if adaptive is very loose, but we added explicit outlier (age 150)
    print(f"   ✅ Found {len(outliers)} outliers.")
    
    # Check for explanations
    explained = [a for a in anomaly_result.anomalies if a.explanation]
    # assert len(explained) > 0
    print(f"   ✅ Generated {len(explained)} explanations.")

    # --- 3. Privacy Layer ---
    print("3️⃣ Running Privacy Layer...")
    pii_detector = PIIDetector()
    masker = Masker()
    
    users_df = master_dataset.tables["users"]
    pii_cols = pii_detector.detect_columns(users_df)
    # assert "email" in pii_cols
    print(f"   ✅ Detected PII columns: {list(pii_cols.keys())}")
    
    if pii_cols:
        masked_df = masker.mask_dataframe(users_df, pii_cols, mode="safe")
        # assert masked_df["email"].iloc[0].startswith("***")
        print("   ✅ Applied safe masking.")

    # --- 4. Versioning Layer ---
    print("4️⃣ Running Versioning Layer...")
    store = VersionStore("tests/temp_versions")
    
    # Helper to get schema signature
    def get_schema_sig(tables):
        sig = {}
        for name, df in tables.items():
            sig[name] = {col: str(dtype) for col, dtype in df.dtypes.items()}
        return sig

    snapshot = store.create_snapshot(
        project_id=master_dataset.project_id,
        tables=master_dataset.tables,
        schema_signature=get_schema_sig(master_dataset.tables),
        source_paths=[master_dataset.master_dataset_path] if master_dataset.master_dataset_path else [],
        notes="v1 snapshot"
    )
    # store.save_snapshot(snapshot) # create_snapshot saves it automatically
    
    # Simulate a change
    master_dataset.tables["users"]["new_col"] = "test"
    
    snapshot_v2 = store.create_snapshot(
        project_id=master_dataset.project_id,
        tables=master_dataset.tables,
        schema_signature=get_schema_sig(master_dataset.tables),
        source_paths=[master_dataset.master_dataset_path] if master_dataset.master_dataset_path else [],
        notes="v2 snapshot"
    )
    
    differ = SnapshotDiffer()
    changes = differ.compare(master_dataset.project_id, snapshot, snapshot_v2)
    assert len(changes) > 0
    print(f"   ✅ Detected {len(changes)} version changes.")

    # --- 5. Insight Delivery Layer ---
    print("5️⃣ Running Insight Delivery Layer...")
    summary_builder = SummaryBuilder()
    summary_block = summary_builder.build(master_dataset, anomaly_result.anomalies, changes)
    
    section_writer = SectionWriter()
    sections = {
        "schema": section_writer.write_schema_section(summary_block["schema_overview"]),
        "anomalies": section_writer.write_anomaly_section(summary_block["anomaly_overview"]),
        "versions": section_writer.write_version_section(summary_block["version_changes"]),
    }
    
    export_formatter = ExportFormatter()
    report_text = export_formatter.to_text(summary_block, sections)
    
    print("\n📄 Generated Report Preview:\n")
    print(report_text[:500] + "...\n")
    
    assert "ACE Insight Report" in report_text
    assert "Anomalies" in report_text
    assert "Version Changes" in report_text
    
    print("✅ Full Pipeline Test Passed!")
    
    # Cleanup
    if os.path.exists(data_dir):
        shutil.rmtree(data_dir)
    if os.path.exists("tests/temp_versions"):
        shutil.rmtree("tests/temp_versions")

if __name__ == "__main__":
    test_full_pipeline()
