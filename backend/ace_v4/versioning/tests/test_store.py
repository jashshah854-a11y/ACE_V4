import pandas as pd
import shutil
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from ace_v4.versioning.store import VersionStore

def test_store_snapshots():
    test_dir = ".test_ace_versions"
    if os.path.exists(test_dir):
        shutil.rmtree(test_dir)
        
    store = VersionStore(base_dir=test_dir)
    project_id = "p1"
    
    tables = {
        "t1": pd.DataFrame({"a": [1, 2]}),
        "t2": pd.DataFrame({"b": ["x"]})
    }
    
    # Create first snapshot
    s1 = store.create_snapshot(
        project_id=project_id,
        tables=tables,
        schema_signature={"t1": {"a": "int"}, "t2": {"b": "str"}},
        source_paths=["file1.csv"]
    )
    
    assert s1.snapshot_id
    assert s1.table_row_counts["t1"] == 2
    
    # Create second snapshot (same data)
    s2 = store.create_snapshot(
        project_id=project_id,
        tables=tables,
        schema_signature={"t1": {"a": "int"}, "t2": {"b": "str"}},
        source_paths=["file1.csv"]
    )
    
    # Should have same hash/ID
    assert s1.snapshot_id == s2.snapshot_id
    
    # Modify data
    tables["t1"] = pd.DataFrame({"a": [1, 2, 3]})
    s3 = store.create_snapshot(
        project_id=project_id,
        tables=tables,
        schema_signature={"t1": {"a": "int"}, "t2": {"b": "str"}},
        source_paths=["file1.csv"]
    )
    
    assert s3.snapshot_id != s1.snapshot_id
    
    # List snapshots
    snaps = store.list_snapshots(project_id)
    assert len(snaps) >= 2
    
    # Cleanup
    shutil.rmtree(test_dir)
    print("✅ test_store_snapshots passed")

if __name__ == "__main__":
    test_store_snapshots()
