import pandas as pd
import numpy as np

# Generate a realistic ecommerce dataset with 100 rows
np.random.seed(42)

n_rows = 100

data = {
    'customer_id': range(1001, 1001 + n_rows),
    'age': np.random.randint(18, 75, n_rows),
    'tenure_months': np.random.randint(1, 60, n_rows),
    'monthly_spend': np.random.uniform(20, 500, n_rows).round(2),
    'total_purchases': np.random.randint(1, 50, n_rows),
    'avg_order_value': np.random.uniform(15, 200, n_rows).round(2),
    'days_since_last_purchase': np.random.randint(0, 180, n_rows),
    'product_category_preference': np.random.choice(['Electronics', 'Fashion', 'Home', 'Books', 'Sports'], n_rows),
    'customer_segment': np.random.choice(['Premium', 'Regular', 'Occasional'], n_rows),
    'churn_risk': np.random.choice([0, 1], n_rows, p=[0.7, 0.3])
}

df = pd.DataFrame(data)

# Add some correlation
df.loc[df['monthly_spend'] > 300, 'customer_segment'] = 'Premium'
df.loc[df['days_since_last_purchase'] > 120, 'churn_risk'] = 1

output_path = 'data/test_sets/ecommerce_realistic.csv'
df.to_csv(output_path, index=False)

print(f"Created {output_path} with {len(df)} rows and {len(df.columns)} columns")
print(f"\nFirst few rows:")
print(df.head())
print(f"\nDataset info:")
print(df.info())
