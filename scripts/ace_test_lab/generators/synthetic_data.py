"""
Synthetic Data Generator for ACE Test Lab

Generates realistic test datasets for various domains.
"""
import random
import string
from datetime import datetime, timedelta
from typing import List, Dict, Any
import csv
import io


def generate_dataset(
    domain: str,
    num_rows: int,
    columns: List[str] = None,
    seed: int = None
) -> str:
    """Generate a CSV dataset for a specific domain."""
    if seed:
        random.seed(seed)
    
    generators = {
        "ecommerce": _generate_ecommerce,
        "saas": _generate_saas,
        "finance": _generate_finance,
        "marketing": _generate_marketing,
        "healthcare": _generate_healthcare,
        "hr": _generate_hr,
        "generic": _generate_generic,
    }
    
    generator = generators.get(domain, _generate_generic)
    rows = generator(num_rows, columns)
    
    # Convert to CSV string
    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    return output.getvalue()


def _random_date(start_year: int = 2024, days_range: int = 365) -> str:
    """Generate a random date."""
    start = datetime(start_year, 1, 1)
    delta = timedelta(days=random.randint(0, days_range))
    return (start + delta).strftime("%Y-%m-%d")


def _random_id(prefix: str = "", length: int = 8) -> str:
    """Generate a random ID."""
    chars = string.ascii_uppercase + string.digits
    return prefix + "".join(random.choices(chars, k=length))


def _generate_ecommerce(num_rows: int, columns: List[str] = None) -> List[Dict]:
    """Generate e-commerce transaction data."""
    categories = ["Electronics", "Clothing", "Home", "Sports", "Beauty", "Food"]
    segments = ["Premium", "Regular", "Budget", "New"]
    
    rows = []
    for i in range(num_rows):
        qty = random.randint(1, 10)
        unit_price = random.uniform(10, 500)
        discount = random.choice([0, 0.05, 0.10, 0.15, 0.20, 0.25])
        
        rows.append({
            "customer_id": _random_id("CUST_"),
            "order_date": _random_date(),
            "product_category": random.choice(categories),
            "quantity": qty,
            "revenue": round(qty * unit_price * (1 - discount), 2),
            "discount_rate": discount,
            "customer_segment": random.choice(segments),
        })
    return rows


def _generate_saas(num_rows: int, columns: List[str] = None) -> List[Dict]:
    """Generate SaaS metrics data."""
    plans = ["Free", "Starter", "Pro", "Enterprise"]
    
    rows = []
    for i in range(num_rows):
        plan = random.choice(plans)
        mrr = {"Free": 0, "Starter": 29, "Pro": 99, "Enterprise": 499}[plan]
        
        rows.append({
            "user_id": _random_id("USR_"),
            "signup_date": _random_date(2023, 700),
            "plan_type": plan,
            "monthly_revenue": mrr + random.randint(-5, 50),
            "feature_usage_score": round(random.uniform(0, 100), 1),
            "churn_risk": round(random.uniform(0, 1), 3),
            "nps_score": random.randint(-100, 100),
        })
    return rows


def _generate_finance(num_rows: int, columns: List[str] = None) -> List[Dict]:
    """Generate financial transaction data."""
    tx_types = ["deposit", "withdrawal", "transfer", "payment", "refund"]
    
    rows = []
    balance = 10000
    for i in range(num_rows):
        tx_type = random.choice(tx_types)
        amount = round(random.uniform(10, 5000), 2)
        if tx_type in ["withdrawal", "payment"]:
            amount = -amount
        balance += amount
        
        rows.append({
            "account_id": _random_id("ACC_"),
            "transaction_date": _random_date(),
            "transaction_amount": amount,
            "transaction_type": tx_type,
            "balance": round(balance, 2),
            "credit_score": random.randint(300, 850),
            "fraud_flag": 1 if random.random() < 0.02 else 0,
        })
    return rows


def _generate_marketing(num_rows: int, columns: List[str] = None) -> List[Dict]:
    """Generate marketing campaign data."""
    channels = ["Google Ads", "Facebook", "Instagram", "Email", "Organic", "Affiliate"]
    campaigns = [f"CMP_{i:03d}" for i in range(1, 20)]
    
    rows = []
    for i in range(num_rows):
        impressions = random.randint(1000, 100000)
        ctr = random.uniform(0.01, 0.10)
        clicks = int(impressions * ctr)
        cvr = random.uniform(0.01, 0.15)
        conversions = int(clicks * cvr)
        cpc = random.uniform(0.5, 5.0)
        aov = random.uniform(50, 500)
        
        rows.append({
            "campaign_id": random.choice(campaigns),
            "date": _random_date(),
            "channel": random.choice(channels),
            "impressions": impressions,
            "clicks": clicks,
            "conversions": conversions,
            "spend": round(clicks * cpc, 2),
            "revenue": round(conversions * aov, 2),
        })
    return rows


def _generate_healthcare(num_rows: int, columns: List[str] = None) -> List[Dict]:
    """Generate healthcare data."""
    diagnoses = ["J06.9", "I10", "E11.9", "M54.5", "F41.1", "K21.0"]
    
    rows = []
    for i in range(num_rows):
        los = random.randint(1, 14)
        rows.append({
            "patient_id": _random_id("PAT_"),
            "visit_date": _random_date(),
            "diagnosis_code": random.choice(diagnoses),
            "treatment_cost": round(random.uniform(500, 50000), 2),
            "length_of_stay": los,
            "readmission_risk": round(random.uniform(0, 0.5), 3),
            "outcome_score": round(random.uniform(0.5, 1.0), 2),
        })
    return rows


def _generate_hr(num_rows: int, columns: List[str] = None) -> List[Dict]:
    """Generate HR/employee data."""
    departments = ["Engineering", "Sales", "Marketing", "HR", "Finance", "Operations"]
    
    rows = []
    for i in range(num_rows):
        dept = random.choice(departments)
        base_salary = {"Engineering": 120000, "Sales": 80000, "Marketing": 75000, 
                       "HR": 65000, "Finance": 90000, "Operations": 70000}[dept]
        
        rows.append({
            "employee_id": _random_id("EMP_"),
            "hire_date": _random_date(2018, 2500),
            "department": dept,
            "salary": base_salary + random.randint(-20000, 50000),
            "performance_score": round(random.uniform(1, 5), 1),
            "satisfaction_score": round(random.uniform(1, 10), 1),
            "attrition_flag": 1 if random.random() < 0.15 else 0,
        })
    return rows


def _generate_generic(num_rows: int, columns: List[str] = None) -> List[Dict]:
    """Generate generic dataset with mixed types."""
    rows = []
    for i in range(num_rows):
        rows.append({
            "id": i + 1,
            "date": _random_date(),
            "category": random.choice(["A", "B", "C", "D"]),
            "value_1": round(random.uniform(0, 1000), 2),
            "value_2": round(random.uniform(0, 100), 2),
            "count": random.randint(1, 100),
            "flag": random.choice([0, 1]),
        })
    return rows


if __name__ == "__main__":
    # Test generation
    for domain in ["ecommerce", "saas", "finance", "marketing", "healthcare", "hr"]:
        csv_data = generate_dataset(domain, 10, seed=42)
        print(f"\n=== {domain.upper()} ===")
        print(csv_data[:500])
