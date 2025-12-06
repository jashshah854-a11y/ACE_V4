import pandas as pd
import numpy as np
import uuid
import random
import json
from pathlib import Path
import time

def generate_pressure_data(output_dir="data/pressure_test", num_customers=100_000, num_transactions=1_000_000):
    print(f"=== Generating Pressure Test Data ===")
    print(f"Target: {num_customers} Customers, {num_transactions} Transactions")
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    start_time = time.time()
    
    # --- 1. Generate Customers ---
    print("Generating Customers...")
    cust_ids = np.arange(1000, 1000 + num_customers)
    
    # Unique Customers (Dimension)
    cust_ids_with_dupes = cust_ids # No duplicates in Dimension
    # np.random.shuffle(cust_ids_with_dupes) # Not needed if unique
    
    names = [f"Customer_{i}" for i in range(len(cust_ids_with_dupes))]
    emails = [f"user_{i}@example.com" for i in range(len(cust_ids_with_dupes))]
    segments = np.random.choice(["VIP", "Regular", "New", "Churned", "Inactive"], size=len(cust_ids_with_dupes))
    
    # Income with outliers
    incomes = np.random.normal(50000, 15000, size=len(cust_ids_with_dupes))
    # Add 0.1% extreme outliers
    num_outliers = int(len(cust_ids_with_dupes) * 0.001)
    incomes[:num_outliers] = incomes[:num_outliers] * 100 # Millionaires
    
    customers_df = pd.DataFrame({
        "cust_id": cust_ids_with_dupes,
        "name": names,
        "email": emails,
        "segment": segments,
        "income": incomes,
        "joined_date": pd.date_range(start="2020-01-01", periods=len(cust_ids_with_dupes), freq="min")
    })
    
    customers_file = output_path / "customers.csv"
    customers_df.to_csv(customers_file, index=False)
    print(f"Saved {len(customers_df)} customers to {customers_file}")
    
    # --- 2. Generate Transactions ---
    print("Generating Transactions...")
    
    # Transaction IDs
    trans_ids = [str(uuid.uuid4()) for _ in range(num_transactions)]
    
    # Foreign Keys (cust_id)
    # 99% valid, 1% orphans
    valid_cust_ids = np.random.choice(cust_ids, size=int(num_transactions * 0.99))
    orphan_cust_ids = np.random.randint(999999, 9999999, size=num_transactions - len(valid_cust_ids))
    trans_cust_ids = np.concatenate([valid_cust_ids, orphan_cust_ids])
    np.random.shuffle(trans_cust_ids)
    
    # Amounts (Log-normal)
    amounts = np.random.lognormal(mean=3, sigma=1, size=num_transactions) * 10
    
    # Status
    statuses = np.random.choice(["completed", "pending", "failed", "refunded"], size=num_transactions, p=[0.8, 0.1, 0.05, 0.05])
    
    # Metadata (JSON)
    # Simple JSON generation
    def generate_meta():
        return json.dumps({"device": "mobile", "ip": "127.0.0.1", "version": "1.0"})
        
    # Vectorized approach for metadata is hard, using list comp (might be slow but ok for 1M)
    # For speed, let's just repeat a few strings
    meta_templates = [
        json.dumps({"device": "mobile", "ip": "1.1.1.1"}),
        json.dumps({"device": "desktop", "browser": "chrome"}),
        json.dumps({"error": "timeout"}),
        "{malformed_json" # 0.1% malformed
    ]
    metadata = np.random.choice(meta_templates, size=num_transactions, p=[0.45, 0.45, 0.099, 0.001])

    transactions_df = pd.DataFrame({
        "trans_id": trans_ids,
        "cust_id": trans_cust_ids,
        "amount": amounts,
        "status": statuses,
        "metadata": metadata,
        "trans_date": pd.date_range(start="2023-01-01", periods=num_transactions, freq="s")
    })
    
    transactions_file = output_path / "transactions.csv"
    transactions_df.to_csv(transactions_file, index=False)
    print(f"Saved {len(transactions_df)} transactions to {transactions_file}")
    
    elapsed = time.time() - start_time
    print(f"=== Data Generation Complete in {elapsed:.2f}s ===")
    return str(output_path)

if __name__ == "__main__":
    generate_pressure_data()
