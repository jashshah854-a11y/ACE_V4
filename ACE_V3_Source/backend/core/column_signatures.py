# core/column_signatures.py
import re

def guess_role_from_name(col):
    col_lower = col.lower().strip()

    rules = [
        ("income_like", ["income", "salary", "earnings"]),
        ("spend_like", ["spend", "purchase", "amount", "expense"]),
        ("balance_like", ["balance"]),
        ("credit_limit_like", ["limit", "credit"]),
        ("debt_like", ["debt", "loan", "arrear"]),
        ("frequency_like", ["frequency", "count", "visits"]),
        ("recency_like", ["days", "recent"]),
        ("tenure_like", ["tenure", "duration", "membership"]),
        ("volatility_like", ["std", "var", "volatility"]),
    ]

    for role, keys in rules:
        for kw in keys:
            if kw in col_lower:
                return role

    return None
