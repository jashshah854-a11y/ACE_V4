import pandas as pd
import numpy as np
import json
import random
import time
from pathlib import Path

def generate_chaos_data(output_dir="data/chaos_test"):
    print(f"=== Generating Chaos Spectrum Test Data ===")
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    start_time = time.time()
    
    # --- Vector 1: Schema Drift (JSON Logs) ---
    # Volume: 500k lines
    # Drift: Every 10k lines, schema changes
    print("Generating Drifting JSON Logs (500k lines)...")
    log_file = output_path / "drifting_logs.ndjson"
    
    base_schema = {"timestamp": "2023-01-01T00:00:00Z", "level": "INFO", "message": "System operational"}
    
    with open(log_file, "w") as f:
        for i in range(500_000):
            record = base_schema.copy()
            record["timestamp"] = f"2023-01-01T{i%24:02d}:{(i//24)%60:02d}:{(i//1440)%60:02d}Z"
            
            # Drift 1: Add user_id (after 10k)
            if i > 10_000:
                record["user_id"] = random.randint(1000, 9999)
                
            # Drift 2: Add latency (after 20k) - Type Conflict
            if i > 20_000:
                if i < 30_000:
                    record["latency"] = random.randint(10, 100) # Int
                elif i < 40_000:
                    record["latency"] = f"{random.randint(10, 100)}ms" # String
                else:
                    record["latency"] = float(random.randint(10, 100)) # Float
            
            # Drift 3: Nested Metadata (after 50k)
            if i > 50_000:
                record["metadata"] = {"ip": f"192.168.1.{random.randint(1, 255)}"}
                
            # Drift 4: Deep Nesting (after 100k)
            if i > 100_000:
                if "metadata" not in record: record["metadata"] = {}
                record["metadata"]["geo"] = {"city": "New York", "zip": 10001}
            
            f.write(json.dumps(record) + "\n")
            
    # --- Vector 2: Toxic CSV (Legacy Data) ---
    # Volume: 100k rows
    print("Generating Toxic CSV (100k rows)...")
    csv_file = output_path / "toxic_legacy.csv"
    
    with open(csv_file, "w", encoding="utf-8") as f:
        # Header
        f.write("id,date_joined,status,amount,notes\n")
        
        for i in range(100_000):
            # ID
            row_id = i
            
            # Mixed Dates
            r = random.random()
            if r < 0.33:
                date = "2023-01-01"
            elif r < 0.66:
                date = "01/01/23"
            else:
                date = "Jan 1, 2023"
                
            # Garbage Nulls
            status_opts = ["Active", "Inactive", "N/A", "null", "-", "MISSING", ""]
            status = random.choice(status_opts)
            
            # Amount (Cleanish)
            amount = round(random.uniform(10, 1000), 2)
            
            # Notes (Encoding issues - Latin-1 chars)
            notes = "Note"
            if random.random() < 0.1:
                notes += " with \xe9\xf1\xa9" # éñ©
                
            # Jagged Rows (Extra commas)
            line = f"{row_id},{date},{status},{amount},{notes}"
            if random.random() < 0.05:
                line += ",extra_garbage"
                
            f.write(line + "\n")
            
    elapsed = time.time() - start_time
    print(f"=== Chaos Data Generation Complete in {elapsed:.2f}s ===")

if __name__ == "__main__":
    generate_chaos_data()
