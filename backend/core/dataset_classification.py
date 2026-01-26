from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple


CUSTOMER_ID_TOKENS = {"customer_id", "client_id", "user_id", "account_id"}
DEMOGRAPHIC_TOKENS = {"age", "gender", "income", "segment", "tenure", "churn", "loyalty", "marital"}
ACCOUNTING_TOKENS = {"ledger", "invoice", "accounts_payable", "accounts_receivable", "balance", "debit", "credit", "fiscal"}
MARKETING_TOKENS = {"campaign", "adgroup", "impression", "click", "ctr", "cpc", "cpm", "roas", "conversion", "utm"}
OPERATIONS_TOKENS = {"inventory", "shipment", "warehouse", "logistics", "vendor", "sku", "lead_time"}
FINANCE_TOKENS = {"revenue", "expense", "profit", "ebitda", "cash_flow", "margin", "sales"}

TRANSACTION_TOKENS = {"transaction_id", "order_id", "invoice_id", "purchase_id"}
SESSION_TOKENS = {"session_id", "session"}

TARGET_TOKENS = {"target", "outcome", "label", "response", "y"}
TIME_TOKENS = {"date", "time", "timestamp", "week", "month", "year", "period"}


def _token_hits(columns: List[str], tokens: set[str]) -> List[str]:
    hits = []
    for col in columns:
        lowered = col.lower()
        if lowered in tokens or any(token in lowered for token in tokens):
            hits.append(col)
    return hits


def _confidence_from_hits(hits: int) -> float:
    if hits <= 0:
        return 0.0
    return min(0.95, 0.35 + (hits * 0.15))


def classify_dataset_profile(
    profile: Dict[str, Any],
    analysis_intent: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    columns = list((profile.get("columns") or {}).keys())
    row_count = int(profile.get("row_count") or 0)
    inferred_types = profile.get("column_types") or {}
    datetime_cols = inferred_types.get("datetime") or []

    domain_tags: List[Dict[str, Any]] = []
    notes: List[str] = []
    signals: Dict[str, Any] = {}

    customer_hits = _token_hits(columns, CUSTOMER_ID_TOKENS)
    demo_hits = _token_hits(columns, DEMOGRAPHIC_TOKENS)
    if customer_hits and demo_hits:
        conf = min(0.95, 0.6 + 0.1 * len(demo_hits))
        domain_tags.append({"tag": "customer_behavior", "confidence": conf})
        signals["customer_behavior"] = {"id_fields": customer_hits, "demographics": demo_hits}

    accounting_hits = _token_hits(columns, ACCOUNTING_TOKENS)
    if accounting_hits:
        domain_tags.append({"tag": "accounting", "confidence": _confidence_from_hits(len(accounting_hits))})
        signals["accounting"] = {"fields": accounting_hits}

    marketing_hits = _token_hits(columns, MARKETING_TOKENS)
    if marketing_hits:
        domain_tags.append({"tag": "marketing", "confidence": _confidence_from_hits(len(marketing_hits))})
        signals["marketing"] = {"fields": marketing_hits}

    operations_hits = _token_hits(columns, OPERATIONS_TOKENS)
    if operations_hits:
        domain_tags.append({"tag": "operations", "confidence": _confidence_from_hits(len(operations_hits))})
        signals["operations"] = {"fields": operations_hits}

    finance_hits = _token_hits(columns, FINANCE_TOKENS)
    if finance_hits:
        domain_tags.append({"tag": "finance", "confidence": _confidence_from_hits(len(finance_hits))})
        signals["finance"] = {"fields": finance_hits}

    if not domain_tags:
        domain_tags.append({"tag": "unknown", "confidence": 0.2})
        notes.append("Domain tags uncertain; no strong column signals detected.")

    temporal_tag = "cross_sectional"
    temporal_conf = 0.5
    if datetime_cols:
        temporal_conf = 0.65
        unique_counts = []
        for col in datetime_cols:
            meta = (profile.get("columns") or {}).get(col) or {}
            unique_counts.append(int(meta.get("unique_count") or meta.get("distinct_count") or 0))
        max_unique = max(unique_counts) if unique_counts else 0
        if max_unique <= 1:
            temporal_tag = "cross_sectional"
            temporal_conf = 0.7
        elif max_unique >= max(10, int(row_count * 0.5)):
            temporal_tag = "time_series"
            temporal_conf = 0.75
        else:
            temporal_tag = "unknown"
            temporal_conf = 0.4
            notes.append("Temporal structure unclear; datetime present but low variation.")

        if temporal_tag == "time_series" and customer_hits:
            temporal_tag = "panel"
            temporal_conf = max(temporal_conf, 0.7)
    else:
        temporal_tag = "cross_sectional"
        temporal_conf = 0.6

    observation_unit = {"tag": "unknown", "confidence": 0.3}
    if customer_hits:
        observation_unit = {"tag": "customer", "confidence": 0.75}
    else:
        transaction_hits = _token_hits(columns, TRANSACTION_TOKENS)
        if transaction_hits:
            observation_unit = {"tag": "transaction", "confidence": 0.7}
        else:
            session_hits = _token_hits(columns, SESSION_TOKENS)
            if session_hits:
                observation_unit = {"tag": "session", "confidence": 0.65}

    target_presence = {"tag": "none", "confidence": 0.5}
    if analysis_intent and analysis_intent.get("target_candidate", {}).get("detected"):
        confidence = float(analysis_intent.get("target_candidate", {}).get("confidence") or 0.5)
        target_presence = {"tag": "single_target", "confidence": min(0.95, max(0.4, confidence))}
    else:
        target_hits = _token_hits(columns, TARGET_TOKENS)
        if len(target_hits) == 1:
            target_presence = {"tag": "single_target", "confidence": 0.4}
        elif len(target_hits) > 1:
            target_presence = {"tag": "multiple_targets", "confidence": 0.35}

    classification = {
        "domain_tags": sorted(domain_tags, key=lambda d: d["confidence"], reverse=True),
        "temporal_structure": {"tag": temporal_tag, "confidence": round(temporal_conf, 3)},
        "observation_unit": observation_unit,
        "target_presence": target_presence,
        "notes": notes,
        "signals": signals,
        "status": "success",
        "valid": True,
    }
    return classification
