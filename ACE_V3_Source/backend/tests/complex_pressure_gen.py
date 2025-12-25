import pandas as pd
import numpy as np
import uuid
import random
import json
from pathlib import Path
import time

def generate_complex_data(output_dir="data/complex_pressure_test"):
    print(f"=== Generating Complex Pressure Test Data (Snowflake Schema) ===")
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    start_time = time.time()
    
    # --- 1. Users (Dimension) ---
    # Volume: 50,000
    num_users = 50_000
    print(f"Generating {num_users} Users...")
    user_ids = np.arange(1000, 1000 + num_users)
    
    users_df = pd.DataFrame({
        "user_id": user_ids,
        "email": [f"user_{i}@example.com" for i in range(num_users)],
        "country": np.random.choice(["US", "UK", "CA", "DE", "FR"], size=num_users),
        "segment": np.random.choice(["Consumer", "Business", "Partner"], size=num_users)
    })
    users_df.to_csv(output_path / "users.csv", index=False)
    
    # --- 2. Products (Dimension) ---
    # Volume: 1,000
    num_products = 1_000
    print(f"Generating {num_products} Products...")
    product_ids = np.arange(100, 100 + num_products)
    
    products_df = pd.DataFrame({
        "product_id": product_ids,
        "category": np.random.choice(["Electronics", "Books", "Home", "Clothing"], size=num_products),
        "price": np.random.uniform(10, 1000, size=num_products).round(2)
    })
    products_df.to_csv(output_path / "products.csv", index=False)
    
    # --- 3. Orders (Fact, Child of Users) ---
    # Volume: 500,000
    num_orders = 500_000
    print(f"Generating {num_orders} Orders...")
    order_ids = np.arange(1_000_000, 1_000_000 + num_orders)
    
    # 99% valid users, 1% orphans
    valid_users = np.random.choice(user_ids, size=int(num_orders * 0.99))
    orphan_users = np.random.randint(999999, 9999999, size=num_orders - len(valid_users))
    order_user_ids = np.concatenate([valid_users, orphan_users])
    np.random.shuffle(order_user_ids)
    
    orders_df = pd.DataFrame({
        "order_id": order_ids,
        "user_id": order_user_ids,
        "order_date": pd.date_range(start="2023-01-01", periods=num_orders, freq="min")
    })
    orders_df.to_csv(output_path / "orders.csv", index=False)
    
    # --- 4. OrderItems (Fact, Child of Orders, Child of Products) ---
    # Volume: 2,000,000
    num_items = 2_000_000
    print(f"Generating {num_items} Order Items...")
    item_ids = [str(uuid.uuid4()) for _ in range(num_items)]
    
    # Link to Orders (99% valid)
    valid_orders = np.random.choice(order_ids, size=int(num_items * 0.99))
    orphan_orders = np.random.randint(9999999, 99999999, size=num_items - len(valid_orders))
    item_order_ids = np.concatenate([valid_orders, orphan_orders])
    np.random.shuffle(item_order_ids)
    
    # Link to Products (99% valid)
    valid_products = np.random.choice(product_ids, size=int(num_items * 0.99))
    invalid_products = np.random.randint(9999, 99999, size=num_items - len(valid_products))
    item_product_ids = np.concatenate([valid_products, invalid_products])
    np.random.shuffle(item_product_ids)
    
    # Quantities (some negative for anomaly detection)
    quantities = np.random.randint(1, 10, size=num_items)
    # 0.1% negative
    num_neg = int(num_items * 0.001)
    quantities[:num_neg] = quantities[:num_neg] * -1
    
    order_items_df = pd.DataFrame({
        "item_id": item_ids,
        "order_id": item_order_ids,
        "product_id": item_product_ids,
        "quantity": quantities
    })
    order_items_df.to_csv(output_path / "order_items.csv", index=False)
    
    elapsed = time.time() - start_time
    print(f"=== Complex Data Generation Complete in {elapsed:.2f}s ===")
    return str(output_path)

if __name__ == "__main__":
    generate_complex_data()
