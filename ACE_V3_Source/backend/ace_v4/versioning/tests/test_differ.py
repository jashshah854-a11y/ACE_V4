import sys
from pathlib import Path
from datetime import datetime, timezone

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from ace_v4.versioning.models import DatasetSnapshot
from ace_v4.versioning.differ import SnapshotDiffer

def make_snapshot(sid, schema, rows, anoms):
    return DatasetSnapshot(
        snapshot_id=sid,
        project_id="p1",
        created_at=datetime.now(timezone.utc).isoformat(),
        schema_signature=schema,
        table_row_counts=rows,
        data_hash="hash",
        anomaly_summary=anoms
    )

def test_differ_schema_change():
    prev = make_snapshot(
        "s1",
        {"t1": {"col1": "int"}},
        {"t1": 10},
        {}
    )
    curr = make_snapshot(
        "s2",
        {"t1": {"col1": "int", "col2": "str"}}, # col2 added
        {"t1": 10},
        {}
    )
    
    differ = SnapshotDiffer()
    changes = differ.compare("p1", prev, curr)
    
    assert len(changes) == 1
    assert changes[0].change_type == "schema_added_column"
    assert changes[0].context["column"] == "col2"
    print("✅ test_differ_schema_change passed")

def test_differ_row_count_change():
    prev = make_snapshot(
        "s1",
        {"t1": {"col1": "int"}},
        {"t1": 100},
        {}
    )
    curr = make_snapshot(
        "s2",
        {"t1": {"col1": "int"}},
        {"t1": 150}, # +50 rows
        {}
    )
    
    differ = SnapshotDiffer()
    changes = differ.compare("p1", prev, curr)
    
    assert len(changes) == 1
    assert changes[0].change_type == "row_count_change"
    assert changes[0].context["delta"] == 50
    print("✅ test_differ_row_count_change passed")

if __name__ == "__main__":
    test_differ_schema_change()
    test_differ_row_count_change()
