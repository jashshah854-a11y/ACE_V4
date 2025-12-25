import sys
import os
import pandas as pd
import zipfile
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from ace_v3_entry import run_ace_v3
from intake.loader import IntakeLoader
from intake.relationships import IntakeRelationships

def create_complex_test_data():
    data_dir = Path("data/test_intake_complex")
    data_dir.mkdir(exist_ok=True, parents=True)
    
    # 1. Customers (Key: cust_id)
    customers = pd.DataFrame({
        "cust_id": [101, 102, 103],
        "name": ["Alice", "Bob", "Charlie"],
        "segment": ["Gold", "Silver", "Bronze"]
    })
    customers.to_csv(data_dir / "customers.csv", index=False)
    
    # 2. Orders (Key: client_id - Fuzzy Match)
    orders = pd.DataFrame({
        "order_id": [1, 2, 3, 4, 5],
        "client_id": [101, 101, 102, 102, 103],
        "total_amount": [100.0, 50.0, 200.0, 20.0, 300.0],
        "order_date": ["2023-01-01", "2023-01-02", "2023-01-03", "2023-01-04", "2023-01-05"]
    })
    orders.to_csv(data_dir / "orders.csv", index=False)
    
    # 3. Summary Report (Should be ignored or classified as summary)
    summary = pd.DataFrame({
        "Month": ["Jan", "Feb", "Mar"],
        "Total Sales": [1000, 2000, 3000],
        "Avg Order": [50, 60, 70]
    })
    summary.to_csv(data_dir / "monthly_summary.csv", index=False)
    
    return str(data_dir)

def test_intake():
    print("=== Testing ACE V4 Intake 2.0 ===")
    
    # Setup Data
    input_dir = create_complex_test_data()
    print(f"Created complex test data in: {input_dir}")
    
    # Run ACE
    try:
        run_id, run_path = run_ace_v3(input_dir)
        print(f"Run completed: {run_id}")
        
        # Verify Master Dataset
        master_path = Path(run_path) / "master_dataset.csv"
        if master_path.exists():
            df = pd.read_csv(master_path)
            print("\nMaster Dataset Preview:")
            print(df.head())
            
            # Check for fused columns from Orders (fuzzy match)
            # Expecting 'orders_total_amount_sum' or similar
            cols = df.columns.tolist()
            fused = any("orders" in c for c in cols)
            
            if fused:
                print("\n✅ SUCCESS: Fuzzy fusion worked.")
            else:
                print(f"\n❌ FAILURE: Fuzzy fusion failed. Columns: {cols}")
                
            # Check Validation
            # We can't easily check the validation dict here without parsing logs or state, 
            # but if it ran without error, that's a good sign.
            
        else:
            print("\n❌ FAILURE: Master dataset not found.")
            
    except Exception as e:
        print(f"\n❌ CRASH: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_intake()


def test_intake_loader_handles_zip(tmp_path):
    loader = IntakeLoader(str(tmp_path))
    csv_dir = tmp_path / "source"
    csv_dir.mkdir()
    csv_path = csv_dir / "customers.csv"
    pd.DataFrame({"id": [1, 2], "name": ["A", "B"]}).to_csv(csv_path, index=False)
    zip_path = tmp_path / "bundle.zip"
    with zipfile.ZipFile(zip_path, 'w') as zf:
        zf.write(csv_path, arcname="customers.csv")
    tables = loader.load_input(str(zip_path))
    assert tables, "Zip ingestion should return at least one table"


def test_relationships_detects_plain_id(tmp_path):
    parent = tmp_path / "parent.csv"
    child = tmp_path / "child.csv"
    pd.DataFrame({"id": [1, 2], "value": [10, 20]}).to_csv(parent, index=False)
    pd.DataFrame({"id": [1, 1, 2], "amount": [5, 7, 3]}).to_csv(child, index=False)
    tables = [
        {"name": "parent", "columns": ["id", "value"], "path": str(parent), "row_count": 2},
        {"name": "child", "columns": ["id", "amount"], "path": str(child), "row_count": 3},
    ]
    rels = IntakeRelationships().detect(tables)
    assert any(rel["parent"] == "parent" and rel["parent_key"] == "id" for rel in rels)

