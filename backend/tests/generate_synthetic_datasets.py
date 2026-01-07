"""
Synthetic Dataset Generator for ACE V4 Stress Testing

Generates adversarial datasets designed to expose edge cases and push
the ACE analytics engine to its limits.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
import json

# Set random seed for reproducibility
np.random.seed(42)

class SyntheticDatasetGenerator:
    """Generate various types of synthetic datasets for stress testing."""
    
    def __init__(self, output_dir="data/stress_tests"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.metadata = []
    
    def generate_extreme_imbalance(self, n_rows=1000):
        """99% one class, 1% another - tests clustering and classification."""
        print("Generating: Extreme Imbalance Dataset...")
        
        # 99% "normal" customers, 1% "high-value"
        n_high_value = int(n_rows * 0.01)
        n_normal = n_rows - n_high_value
        
        df = pd.DataFrame({
            'customer_id': range(n_rows),
            'revenue': np.concatenate([
                np.random.normal(100, 20, n_normal),  # Normal customers
                np.random.normal(10000, 2000, n_high_value)  # High-value
            ]),
            'visits': np.concatenate([
                np.random.poisson(5, n_normal),
                np.random.poisson(50, n_high_value)
            ]),
            'segment': ['normal'] * n_normal + ['high_value'] * n_high_value,
            'churn_risk': np.concatenate([
                np.random.choice([0, 1], n_normal, p=[0.9, 0.1]),
                np.random.choice([0, 1], n_high_value, p=[0.95, 0.05])
            ])
        })
        
        # Shuffle to mix classes
        df = df.sample(frac=1).reset_index(drop=True)
        
        filepath = self.output_dir / "extreme_imbalance.csv"
        df.to_csv(filepath, index=False)
        
        self.metadata.append({
            "name": "extreme_imbalance",
            "description": "99% normal, 1% high-value customers",
            "rows": n_rows,
            "expected_challenges": ["Clustering may collapse to single cluster", "Minority class detection"],
            "success_criteria": ["ACE identifies the 1% high-value segment", "Churn model handles imbalance"]
        })
        
        return filepath
    
    def generate_high_dimensionality(self, n_rows=100, n_features=1000):
        """1000 features, 100 rows - curse of dimensionality."""
        print("Generating: High Dimensionality Dataset...")
        
        # Generate mostly noise features
        data = {}
        data['id'] = range(n_rows)
        
        # Add 5 meaningful features
        data['revenue'] = np.random.lognormal(8, 2, n_rows)
        data['age'] = np.random.randint(18, 80, n_rows)
        data['tenure_months'] = np.random.randint(1, 120, n_rows)
        data['satisfaction'] = np.random.uniform(1, 5, n_rows)
        data['churn'] = (data['satisfaction'] < 2.5).astype(int)
        
        # Add 995 noise features
        for i in range(n_features - 5):
            data[f'noise_feature_{i}'] = np.random.randn(n_rows)
        
        df = pd.DataFrame(data)
        
        filepath = self.output_dir / "high_dimensionality.csv"
        df.to_csv(filepath, index=False)
        
        self.metadata.append({
            "name": "high_dimensionality",
            "description": f"{n_features} features, {n_rows} rows",
            "expected_challenges": ["Feature importance should filter noise", "Memory/performance issues"],
            "success_criteria": ["ACE identifies the 5 meaningful features", "Pipeline completes without crash"]
        })
        
        return filepath
    
    def generate_perfect_correlation(self, n_rows=500):
        """Features that are 100% correlated - tests multicollinearity handling."""
        print("Generating: Perfect Correlation Dataset...")
        
        base = np.random.randn(n_rows)
        
        df = pd.DataFrame({
            'customer_id': range(n_rows),
            'revenue': base * 1000 + 5000,
            'revenue_copy_1': base * 1000 + 5000,  # Exact duplicate
            'revenue_copy_2': base * 1000 + 5000,  # Exact duplicate
            'revenue_scaled': base * 100 + 500,     # Linear transform
            'revenue_inverse': -base * 1000 + 5000, # Perfect negative correlation
            'visits': np.random.poisson(10, n_rows),
            'satisfaction': np.random.uniform(1, 5, n_rows)
        })
        
        filepath = self.output_dir / "perfect_correlation.csv"
        df.to_csv(filepath, index=False)
        
        self.metadata.append({
            "name": "perfect_correlation",
            "description": "Multiple perfectly correlated features",
            "expected_challenges": ["Correlation analysis should flag this", "Feature importance may be unstable"],
            "success_criteria": ["ACE detects perfect correlations", "Regression doesn't crash"]
        })
        
        return filepath
    
    def generate_zero_variance(self, n_rows=300):
        """Columns with identical values - tests variance checks."""
        print("Generating: Zero Variance Dataset...")
        
        df = pd.DataFrame({
            'customer_id': range(n_rows),
            'constant_1': [100] * n_rows,  # No variance
            'constant_2': ['same_value'] * n_rows,  # No variance
            'revenue': np.random.lognormal(7, 1.5, n_rows),
            'visits': np.random.poisson(8, n_rows),
            'region': ['North'] * n_rows,  # All same region
            'plan_type': ['Premium'] * n_rows  # All same plan
        })
        
        filepath = self.output_dir / "zero_variance.csv"
        df.to_csv(filepath, index=False)
        
        self.metadata.append({
            "name": "zero_variance",
            "description": "Multiple columns with zero variance",
            "expected_challenges": ["Feature importance should skip these", "Clustering may fail"],
            "success_criteria": ["ACE filters out zero-variance features", "Quality metrics flag this issue"]
        })
        
        return filepath
    
    def generate_missing_data_hell(self, n_rows=400):
        """50%+ missing values across board."""
        print("Generating: Missing Data Hell Dataset...")
        
        df = pd.DataFrame({
            'customer_id': range(n_rows),
            'revenue': np.random.lognormal(8, 2, n_rows),
            'age': np.random.randint(18, 80, n_rows),
            'visits': np.random.poisson(10, n_rows),
            'satisfaction': np.random.uniform(1, 5, n_rows),
            'tenure_months': np.random.randint(1, 100, n_rows),
            'last_purchase_date': pd.date_range('2024-01-01', periods=n_rows, freq='D')
        })
        
        # Introduce 60% missing data randomly
        for col in ['revenue', 'age', 'visits', 'satisfaction', 'tenure_months']:
            mask = np.random.rand(n_rows) < 0.6
            df.loc[mask, col] = np.nan
        
        filepath = self.output_dir / "missing_data_hell.csv"
        df.to_csv(filepath, index=False)
        
        self.metadata.append({
            "name": "missing_data_hell",
            "description": "60% missing values across most columns",
            "expected_challenges": ["Data quality score should be very low", "Imputation strategies tested"],
            "success_criteria": ["ACE completes analysis", "Quality report flags missing data"]
        })
        
        return filepath
    
    def generate_outlier_storm(self, n_rows=500):
        """Extreme outliers in every numeric column."""
        print("Generating: Outlier Storm Dataset...")
        
        df = pd.DataFrame({
            'customer_id': range(n_rows),
            'revenue': np.concatenate([
                np.random.lognormal(7, 1, n_rows - 10),
                np.random.uniform(1000000, 10000000, 10)  # Extreme outliers
            ]),
            'age': np.concatenate([
                np.random.randint(18, 80, n_rows - 5),
                [150, 200, 250, 300, 999]  # Impossible ages
            ]),
            'visits': np.concatenate([
                np.random.poisson(10, n_rows - 8),
                np.random.randint(10000, 100000, 8)  # Extreme visit counts
            ]),
            'satisfaction': np.concatenate([
                np.random.uniform(1, 5, n_rows - 3),
                [100, -50, 9999]  # Out of range
            ])
        })
        
        # Shuffle
        df = df.sample(frac=1).reset_index(drop=True)
        
        filepath = self.output_dir / "outlier_storm.csv"
        df.to_csv(filepath, index=False)
        
        self.metadata.append({
            "name": "outlier_storm",
            "description": "Extreme outliers in every numeric column",
            "expected_challenges": ["Distribution analysis should detect outliers", "Anomaly detection triggered"],
            "success_criteria": ["ACE flags outliers", "Robust statistics used"]
        })
        
        return filepath
    
    def generate_time_series_chaos(self, n_rows=1000):
        """Non-stationary time series with multiple seasonalities."""
        print("Generating: Time Series Chaos Dataset...")
        
        dates = pd.date_range('2020-01-01', periods=n_rows, freq='D')
        
        # Create complex time series
        t = np.arange(n_rows)
        trend = t * 0.5  # Linear trend
        seasonal_weekly = 100 * np.sin(2 * np.pi * t / 7)  # Weekly pattern
        seasonal_yearly = 200 * np.sin(2 * np.pi * t / 365)  # Yearly pattern
        noise = np.random.normal(0, 50, n_rows)
        
        # Add structural break at midpoint
        structural_break = np.where(t > n_rows/2, 500, 0)
        
        revenue = trend + seasonal_weekly + seasonal_yearly + noise + structural_break
        revenue = np.maximum(revenue, 0)  # No negative revenue
        
        df = pd.DataFrame({
            'date': dates,
            'revenue': revenue,
            'customers': np.random.poisson(50, n_rows),
            'marketing_spend': np.random.lognormal(8, 1, n_rows)
        })
        
        filepath = self.output_dir / "time_series_chaos.csv"
        df.to_csv(filepath, index=False)
        
        self.metadata.append({
            "name": "time_series_chaos",
            "description": "Non-stationary time series with structural break",
            "expected_challenges": ["Time series detection", "Trend + seasonality decomposition"],
            "success_criteria": ["ACE identifies time series pattern", "Detects structural break"]
        })
        
        return filepath
    
    def generate_type_confusion(self, n_rows=300):
        """Numeric columns stored as strings."""
        print("Generating: Type Confusion Dataset...")
        
        df = pd.DataFrame({
            'customer_id': range(n_rows),
            'revenue': [f"${x:.2f}" for x in np.random.lognormal(8, 2, n_rows)],  # String with $
            'age': [str(x) for x in np.random.randint(18, 80, n_rows)],  # Numeric as string
            'visits': [f"{x} visits" for x in np.random.poisson(10, n_rows)],  # String with unit
            'satisfaction': np.random.uniform(1, 5, n_rows),  # Actual numeric
            'is_active': ['True' if x > 0.5 else 'False' for x in np.random.rand(n_rows)]  # Boolean as string
        })
        
        filepath = self.output_dir / "type_confusion.csv"
        df.to_csv(filepath, index=False)
        
        self.metadata.append({
            "name": "type_confusion",
            "description": "Numeric data stored as strings with formatting",
            "expected_challenges": ["Type detection and parsing", "Data cleaning required"],
            "success_criteria": ["ACE parses strings to numbers", "Analysis proceeds correctly"]
        })
        
        return filepath
    
    def generate_categorical_explosion(self, n_rows=500):
        """10,000+ unique categories in single column."""
        print("Generating: Categorical Explosion Dataset...")
        
        df = pd.DataFrame({
            'customer_id': range(n_rows),
            'product_id': [f"PROD_{i}" for i in range(n_rows)],  # Every row unique
            'user_agent': [f"Browser_{i}_Version_{j}" for i, j in zip(
                np.random.randint(1, 100, n_rows),
                np.random.randint(1, 100, n_rows)
            )],  # High cardinality
            'revenue': np.random.lognormal(7, 1.5, n_rows),
            'category': np.random.choice(['A', 'B', 'C'], n_rows)  # Normal categorical
        })
        
        filepath = self.output_dir / "categorical_explosion.csv"
        df.to_csv(filepath, index=False)
        
        self.metadata.append({
            "name": "categorical_explosion",
            "description": "Extremely high cardinality categorical features",
            "expected_challenges": ["Memory issues with encoding", "Feature importance may struggle"],
            "success_criteria": ["ACE handles high cardinality", "Identifies ID-like columns"]
        })
        
        return filepath
    
    def generate_all_datasets(self):
        """Generate all synthetic datasets."""
        print("=" * 60)
        print("ACE V4 Synthetic Dataset Generator")
        print("=" * 60)
        
        datasets = [
            self.generate_extreme_imbalance(),
            self.generate_high_dimensionality(),
            self.generate_perfect_correlation(),
            self.generate_zero_variance(),
            self.generate_missing_data_hell(),
            self.generate_outlier_storm(),
            self.generate_time_series_chaos(),
            self.generate_type_confusion(),
            self.generate_categorical_explosion()
        ]
        
        # Save metadata
        metadata_path = self.output_dir / "dataset_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(self.metadata, f, indent=2)
        
        print("\n" + "=" * 60)
        print(f"✅ Generated {len(datasets)} synthetic datasets")
        print(f"📁 Output directory: {self.output_dir}")
        print(f"📋 Metadata saved to: {metadata_path}")
        print("=" * 60)
        
        return datasets, self.metadata


if __name__ == "__main__":
    generator = SyntheticDatasetGenerator()
    datasets, metadata = generator.generate_all_datasets()
    
    print("\n📊 Dataset Summary:")
    for meta in metadata:
        print(f"\n  {meta['name']}:")
        print(f"    - {meta['description']}")
        print(f"    - Rows: {meta.get('rows', 'N/A')}")
        print(f"    - Expected challenges: {', '.join(meta['expected_challenges'])}")
