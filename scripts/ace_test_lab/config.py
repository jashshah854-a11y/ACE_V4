"""
ACE Test Lab Configuration
"""
# API Endpoints
PRODUCTION_API = "https://ace-v4-production.up.railway.app"
LOCAL_API = "http://localhost:8000"

# Redis (for monitoring job queue)
REDIS_URL = "redis://switchback.proxy.rlwy.net:50085"

# Test Thresholds
THRESHOLDS = {
    "max_processing_time_100_rows": 30,      # seconds
    "max_processing_time_1000_rows": 60,     # seconds
    "max_processing_time_10000_rows": 180,   # seconds
    "min_quality_score": 0.8,
    "min_confidence_for_insights": 0.35,
}

# Test Categories
ENABLED_CATEGORIES = [
    "stress",
    "domain", 
    "edge_cases",
    "guardrails",
    "api",
]

# Domain configurations for synthetic data
DOMAINS = {
    "ecommerce": {
        "columns": ["customer_id", "order_date", "product_category", "quantity", "revenue", "discount_rate", "customer_segment"],
        "row_range": (100, 1000),
    },
    "saas": {
        "columns": ["user_id", "signup_date", "plan_type", "monthly_revenue", "feature_usage_score", "churn_risk", "nps_score"],
        "row_range": (100, 1000),
    },
    "finance": {
        "columns": ["account_id", "transaction_date", "transaction_amount", "transaction_type", "balance", "credit_score", "fraud_flag"],
        "row_range": (100, 1000),
    },
    "marketing": {
        "columns": ["campaign_id", "date", "channel", "impressions", "clicks", "conversions", "spend", "revenue"],
        "row_range": (100, 500),
    },
    "healthcare": {
        "columns": ["patient_id", "visit_date", "diagnosis_code", "treatment_cost", "length_of_stay", "readmission_risk", "outcome_score"],
        "row_range": (100, 500),
    },
    "hr": {
        "columns": ["employee_id", "hire_date", "department", "salary", "performance_score", "satisfaction_score", "attrition_flag"],
        "row_range": (100, 500),
    },
}
