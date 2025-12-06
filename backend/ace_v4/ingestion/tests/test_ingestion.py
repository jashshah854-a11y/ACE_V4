import pandas as pd
import json
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from ace_v4.ingestion.auto_loader import AutoLoader
from ace_v4.ingestion.flattener import Flattener

def test_flattener():
    record = {
        "user": {"id": 1, "name": "Alice"},
        "items": [{"sku": "A1"}, {"sku": "B2"}]
    }
    
    flat = Flattener().flatten_record(record)
    
    assert flat["user.id"] == 1
    assert flat["user.name"] == "Alice"
    assert flat["items.0.sku"] == "A1"
    assert flat["items.1.sku"] == "B2"
    print("✅ test_flattener passed")

def test_json_parser_auto_loader():
    data = {"user": {"id": 5, "name": "John"}}
    path = "test_ingest.json"
    with open(path, "w") as f:
        json.dump(data, f)
        
    df = AutoLoader().load(path)
    
    assert "user.id" in df.columns
    assert df.iloc[0]["user.id"] == 5
    
    os.remove(path)
    print("✅ test_json_parser_auto_loader passed")

def test_ndjson_parser_auto_loader():
    path = "test_ingest.ndjson"
    with open(path, "w") as f:
        f.write('{"id": 1, "val": "a"}\n')
        f.write('{"id": 2, "val": "b"}\n')
        
    df = AutoLoader().load(path)
    
    assert len(df) == 2
    assert df.iloc[0]["val"] == "a"
    
    os.remove(path)
    print("✅ test_ndjson_parser_auto_loader passed")

def test_log_parser_auto_loader():
    path = "test_ingest.log"
    with open(path, "w") as f:
        f.write('2024-01-01 INFO user=admin action=login\n')
        f.write('2024-01-01 ERROR user=guest action=fail\n')
        
    df = AutoLoader().load(path)
    
    assert len(df) == 2
    assert "user" in df.columns
    assert df.iloc[0]["user"] == "admin"
    assert df.iloc[1]["action"] == "fail"
    
    os.remove(path)
    print("✅ test_log_parser_auto_loader passed")

if __name__ == "__main__":
    test_flattener()
    test_json_parser_auto_loader()
    test_ndjson_parser_auto_loader()
    test_log_parser_auto_loader()
