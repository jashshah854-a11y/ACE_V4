import sys
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd

sys.path.append(str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from core.data_guardrails import SUPPORTED_DATA_TYPES


DATA_TYPE_KEYWORDS: Dict[str, List[str]] = {
    "marketing_performance": ["cpc", "ctr", "impressions", "clicks", "campaign", "adgroup", "roas", "ad_spend"],
    "technical_metrics": ["cpu", "memory", "latency", "throughput", "qps", "error_rate", "requests_per", "status_code"],
    "correlation_outputs": ["correlation", "pearson", "spearman", "covariance", "p-value", "r_value"],
    "time_series_trends": ["timestamp", "date_time", "created_at", "updated_at", "fiscal_year", "fiscal_quarter"],
    "forecast_prediction": ["forecast", "prediction", "predicted", "projection", "confidence_interval"],
    "political_policy": ["election", "vote", "policy", "bill", "senate", "house", "candidate", "approval_rating"],
    "financial_accounting": ["general_ledger", "invoice_id", "accounts_payable", "accounts_receivable", "ebitda", "profit_loss", "balance_sheet", "tax_amount", "fiscal"],
    "customer_behavior": ["customer", "user", "session", "click", "page_view", "transaction", "shopping", "points", "reward", "loyalty", "churn", "tenure", "income", "credit_limit", "balance", "spend"],
    "operational_supply_chain": ["inventory", "sku", "lead_time", "supplier", "warehouse", "logistics", "shipment_id"],
    "survey_qualitative": ["survey", "respondent", "nps", "likert", "verbatim", "comment", "feedback"],
    "geospatial": ["latitude", "longitude", "coordinates", "postal_code", "zip_code"],
    "experimental_ab_test": ["variant_id", "control_group", "treatment", "experiment_id", "ab_test"],
    "risk_compliance": ["compliance_status", "audit_log", "breach_id", "risk_level"],
    "text_narrative": ["summary", "description", "transcript", "full_text"],
}


def score_data_types(df: pd.DataFrame) -> List[Tuple[str, int]]:
    columns = [c.lower() for c in df.columns]
    scores: List[Tuple[str, int]] = []
    
    # Pre-scan for customer/transaction overlap
    has_customer_keys = any(k in "".join(columns) for k in ["customer", "user", "client"])
    
    for dtype, keywords in DATA_TYPE_KEYWORDS.items():
        score = 0
        for col in columns:
            score += sum(1 for kw in keywords if kw in col)
            
        # Boost customer behavior if we see explicit customer keys
        if dtype == "customer_behavior" and has_customer_keys:
            score += 2
            
        scores.append((dtype, score))
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores


def detect_time_signal(df: pd.DataFrame) -> bool:
    time_keywords = {"date", "time", "year", "month", "day", "hour", "minute", "second", "timestamp", "week", "quarter"}
    for col in df.columns:
        # Check dtype first - this is the strongest signal
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            return True
            
        # Check column name with stricter logic
        col_lower = str(col).lower()
        
        # 1. Exact match - strong signal
        if col_lower in time_keywords:
            # Verify content looks like time/date if it's object type
            if df[col].dtype == 'object':
                try:
                    parsed = pd.to_datetime(df[col].dropna().head(10), errors='coerce')
                    if parsed.notna().any():
                        return True
                except:
                    pass
            else:
                return True
            
        # 2. Suffix/Prefix match (e.g. created_at, birth_date) - medium signal
        if any(col_lower.endswith(f"_{kw}") or col_lower.startswith(f"{kw}_") for kw in time_keywords):
            # Same content verification for object types
            if df[col].dtype == 'object':
                try:
                    parsed = pd.to_datetime(df[col].dropna().head(10), errors='coerce')
                    if parsed.notna().any():
                        return True
                except:
                    pass
            else:
                return True
            
        # 3. Common specific terms that don't follow _ pattern
        if col_lower in ("created_at", "updated_at", "deadline", "schedule"):
            return True
            
    return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python data_typing.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)
    data_path = state.get_file_path("cleaned_uploaded.csv")

    if not Path(data_path).exists():
        print(f"[DATA_TYPING] Missing dataset at {data_path}")
        state.write("data_type", {"primary_type": "unknown", "confidence": "low", "reason": "missing_dataset"})
        sys.exit(1)

    df = pd.read_csv(data_path, nrows=5000)

    scores = score_data_types(df)
    top_type, top_score = scores[0]
    secondary = [t for t, s in scores[1:4] if s > 0]

    is_time = detect_time_signal(df)
    if is_time and top_type not in ("time_series_trends", "forecast_prediction"):
        secondary = list({*secondary, "time_series_trends"})

    if top_score == 0:
        primary = "unknown"
        confidence = "low"
    elif top_score < 3:
        primary = top_type
        confidence = "low"
    elif top_score < 6:
        primary = top_type
        confidence = "moderate"
    else:
        primary = top_type
        confidence = "high"

    if len({primary, *secondary} & {"text_narrative"}) and len(df.columns) > 5:
        primary = "mixed"
        confidence = "moderate"

    result = {
        "primary_type": primary if primary in SUPPORTED_DATA_TYPES else "unknown",
        "secondary": secondary,
        "confidence": confidence,
        "signals": {t: s for t, s in scores if s > 0},
        "has_time_dimension": is_time,
        "row_count": len(df),
        "column_count": len(df.columns),
    }

    print(f"[DATA_TYPING] Detected {result['primary_type']} (confidence={confidence})")
    state.write("data_type", result)
    sys.exit(0)


if __name__ == "__main__":
    main()

