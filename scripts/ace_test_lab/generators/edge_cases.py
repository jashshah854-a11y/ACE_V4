"""
Edge Case Data Generator for ACE Test Lab

Creates datasets that stress-test boundary conditions.
"""
import random
import string
import csv
import io
from typing import List, Dict, Any


def generate_edge_case(case_type: str, num_rows: int = 100, seed: int = None) -> str:
    """Generate a specific edge case dataset."""
    if seed:
        random.seed(seed)
    
    generators = {
        "empty_columns": _empty_columns,
        "single_value": _single_value_column,
        "unicode_chaos": _unicode_chaos,
        "date_format_mix": _date_format_mix,
        "extreme_outliers": _extreme_outliers,
        "missing_90_percent": _missing_90_percent,
        "all_categorical": _all_categorical,
        "all_numeric": _all_numeric,
        "duplicate_columns": _duplicate_columns,
        "mixed_types": _mixed_types,
        "sparse_matrix": _sparse_matrix,
        "high_cardinality": _high_cardinality,
        "perfect_correlation": _perfect_correlation,
        "zero_variance_target": _zero_variance_target,
        "inverted_header": _inverted_header,
        "negative_values": _negative_values,
        "scientific_notation": _scientific_notation,
        "super_wide": _super_wide_schema,
        "pii_data": _pii_data,
        "time_gaps": _time_gaps,
    }
    
    generator = generators.get(case_type)
    if not generator:
        raise ValueError(f"Unknown edge case type: {case_type}")
    
    rows = generator(num_rows)
    
    # Convert to CSV string
    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    return output.getvalue()


def _empty_columns(n: int) -> List[Dict]:
    """Dataset with columns that are entirely null."""
    return [
        {
            "id": i,
            "filled_col": random.randint(1, 100),
            "empty_col_1": None,
            "empty_col_2": "",
            "filled_col_2": random.uniform(0, 1),
        }
        for i in range(n)
    ]


def _single_value_column(n: int) -> List[Dict]:
    """Dataset with zero-variance columns."""
    return [
        {
            "id": i,
            "constant_num": 42,
            "constant_str": "SAME",
            "variable": random.randint(1, 100),
        }
        for i in range(n)
    ]


def _unicode_chaos(n: int) -> List[Dict]:
    """Dataset with unicode edge cases."""
    emojis = ["🚀", "💰", "📊", "🎯", "⚠️", "✅", "❌", "🔥"]
    rtl_text = ["مرحبا", "שלום", "مرحبا بك"]
    special = ["café", "naïve", "résumé", "Ñoño", "日本語"]
    
    return [
        {
            "id": i,
            "emoji_col": random.choice(emojis),
            "rtl_col": random.choice(rtl_text),
            "special_chars": random.choice(special),
            "mixed": f"{random.choice(emojis)} {random.choice(special)}",
            "value": random.randint(1, 100),
        }
        for i in range(n)
    ]


def _date_format_mix(n: int) -> List[Dict]:
    """Dataset with inconsistent date formats."""
    formats = [
        "2024-01-15",           # ISO
        "01/15/2024",           # US
        "15/01/2024",           # EU
        "January 15, 2024",     # Long
        "2024/01/15",           # Slash ISO
        "15-Jan-2024",          # Short month
        "1705276800",           # Unix timestamp (as string)
    ]
    
    return [
        {
            "id": i,
            "date_col": random.choice(formats),
            "value": random.randint(1, 100),
        }
        for i in range(n)
    ]


def _extreme_outliers(n: int) -> List[Dict]:
    """Dataset with extreme outlier values."""
    rows = []
    for i in range(n):
        # 5% chance of extreme outlier
        if random.random() < 0.05:
            value = random.choice([1e12, -1e12, 1e-12])
        else:
            value = random.gauss(100, 15)
        
        rows.append({
            "id": i,
            "normal_col": random.gauss(50, 10),
            "outlier_prone": value,
            "category": random.choice(["A", "B", "C"]),
        })
    return rows


def _missing_90_percent(n: int) -> List[Dict]:
    """Dataset with 90% missing values."""
    return [
        {
            "id": i,
            "sparse_1": random.randint(1, 100) if random.random() > 0.9 else None,
            "sparse_2": random.choice(["A", "B"]) if random.random() > 0.9 else None,
            "sparse_3": random.uniform(0, 1) if random.random() > 0.9 else None,
            "dense": random.randint(1, 100),
        }
        for i in range(n)
    ]


def _all_categorical(n: int) -> List[Dict]:
    """Dataset with no numeric columns."""
    return [
        {
            "id": f"ID_{i}",
            "category_a": random.choice(["Low", "Medium", "High"]),
            "category_b": random.choice(["North", "South", "East", "West"]),
            "category_c": random.choice(["Active", "Inactive", "Pending"]),
            "text_col": "".join(random.choices(string.ascii_letters, k=10)),
        }
        for i in range(n)
    ]


def _all_numeric(n: int) -> List[Dict]:
    """Dataset with only numeric columns."""
    return [
        {
            "metric_1": random.randint(1, 1000),
            "metric_2": random.uniform(0, 100),
            "metric_3": random.gauss(50, 15),
            "metric_4": random.randint(0, 1),
            "metric_5": random.expovariate(0.1),
        }
        for i in range(n)
    ]


def _duplicate_columns(n: int) -> List[Dict]:
    """Dataset with nearly duplicate column patterns."""
    return [
        {
            "revenue": (v := random.randint(100, 10000)),
            "revenue_copy": v,  # Exact duplicate
            "revenue_scaled": v * 1.1,  # Linearly related
            "cost": random.randint(50, 5000),
        }
        for i in range(n)
    ]


def _mixed_types(n: int) -> List[Dict]:
    """Dataset with columns containing mixed types."""
    def random_numeric_or_string():
        if random.random() < 0.2:
            return random.choice(["N/A", "null", "-", "missing", "TBD"])
        return random.randint(1, 100)
    
    return [
        {
            "id": i,
            "mixed_col": random_numeric_or_string(),
            "clean_col": random.randint(1, 100),
        }
        for i in range(n)
    ]


def _sparse_matrix(n: int) -> List[Dict]:
    """Wide sparse dataset (many columns, few values per row)."""
    cols = [f"feature_{i}" for i in range(50)]
    rows = []
    for i in range(n):
        row = {"id": i}
        # Only 5 random columns have values
        active_cols = random.sample(cols, 5)
        for col in cols:
            row[col] = random.uniform(0, 1) if col in active_cols else 0
        rows.append(row)
    return rows


def _high_cardinality(n: int) -> List[Dict]:
    """Dataset with very high cardinality categorical columns."""
    return [
        {
            "id": i,
            "unique_id": f"UUID_{i}_{random.randint(10000, 99999)}",
            "semi_unique": f"GROUP_{i % (n // 2)}",
            "low_cardinality": random.choice(["A", "B", "C"]),
            "value": random.randint(1, 100),
        }
        for i in range(n)
    ]


def _perfect_correlation(n: int) -> List[Dict]:
    """Dataset with perfectly correlated columns (data leakage test)."""
    return [
        {
            "id": i,
            "input_a": (a := random.randint(1, 100)),
            "input_b": (b := random.randint(1, 100)),
            "target": a + b,  # Perfect linear relationship
            "leaky_feature": a + b + random.gauss(0, 0.001),  # Near-perfect
        }
        for i in range(n)
    ]


def _zero_variance_target(n: int) -> List[Dict]:
    """Dataset where the target variable has no variance."""
    return [
        {
            "id": i,
            "feature_1": random.randint(1, 100),
            "feature_2": random.uniform(0, 1),
            "target": 1,  # Constant - no variance
        }
        for i in range(n)
    ]


def _inverted_header(n: int) -> List[Dict]:
    """Dataset where column names look like values and vice versa."""
    return [
        {
            "123": random.choice(["revenue", "cost", "profit"]),
            "456.78": random.choice(["high", "medium", "low"]),
            "true": random.randint(1, 100),
            "2024-01-01": random.choice(["A", "B", "C"]),
        }
        for i in range(n)
    ]


def _negative_values(n: int) -> List[Dict]:
    """Dataset with unexpected negative values."""
    return [
        {
            "id": i,
            "count": random.randint(-50, 100),  # Counts shouldn't be negative
            "percentage": random.uniform(-20, 120),  # Percentages outside 0-100
            "revenue": random.uniform(-1000, 5000),
            "age": random.randint(-5, 80),  # Negative age
        }
        for i in range(n)
    ]


def _scientific_notation(n: int) -> List[Dict]:
    """Dataset with scientific notation values."""
    return [
        {
            "id": i,
            "tiny": f"{random.uniform(1, 9):.6e}",
            "huge": f"{random.uniform(1, 9)}e+{random.randint(6, 12)}",
            "normal": random.randint(1, 100),
        }
        for i in range(n)
    ]


def _super_wide_schema(n: int) -> List[Dict]:
    """Dataset with 100+ columns."""
    rows = []
    for i in range(n):
        row = {"id": i}
        for j in range(100):
            row[f"col_{j:03d}"] = random.randint(1, 100)
        rows.append(row)
    return rows


def _pii_data(n: int) -> List[Dict]:
    """Dataset containing obvious PII for detection testing."""
    def fake_ssn():
        return f"{random.randint(100,999)}-{random.randint(10,99)}-{random.randint(1000,9999)}"
    
    def fake_email():
        domains = ["gmail.com", "yahoo.com", "company.com"]
        return f"user{random.randint(1,9999)}@{random.choice(domains)}"
    
    def fake_phone():
        return f"({random.randint(200,999)}) {random.randint(100,999)}-{random.randint(1000,9999)}"
    
    return [
        {
            "customer_id": i,
            "email": fake_email(),
            "phone": fake_phone(),
            "ssn": fake_ssn(),
            "credit_card": f"{random.randint(4000,4999)}-****-****-{random.randint(1000,9999)}",
            "purchase_amount": random.randint(10, 1000),
        }
        for i in range(n)
    ]


def _time_gaps(n: int) -> List[Dict]:
    """Dataset with irregular time gaps."""
    from datetime import datetime, timedelta
    
    rows = []
    current_date = datetime(2024, 1, 1)
    
    for i in range(n):
        rows.append({
            "id": i,
            "date": current_date.strftime("%Y-%m-%d"),
            "value": random.randint(1, 100),
        })
        # Random gap between 1 day and 30 days
        current_date += timedelta(days=random.randint(1, 30))
    
    return rows


# Master list of all edge cases
EDGE_CASES = [
    "empty_columns",
    "single_value", 
    "unicode_chaos",
    "date_format_mix",
    "extreme_outliers",
    "missing_90_percent",
    "all_categorical",
    "all_numeric",
    "duplicate_columns",
    "mixed_types",
    "sparse_matrix",
    "high_cardinality",
    "perfect_correlation",
    "zero_variance_target",
    "inverted_header",
    "negative_values",
    "scientific_notation",
    "super_wide",
    "pii_data",
    "time_gaps",
]


if __name__ == "__main__":
    # Test each edge case
    for case in EDGE_CASES[:5]:
        print(f"\n=== {case.upper()} ===")
        try:
            csv_data = generate_edge_case(case, 5, seed=42)
            print(csv_data[:500])
        except Exception as e:
            print(f"Error: {e}")
