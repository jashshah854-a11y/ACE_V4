import math
from typing import Dict, List, Optional, Tuple

import pandas as pd


class DataTypeResult:
    def __init__(
        self,
        primary: str,
        secondary: List[str],
        confidence: float,
        signals: Dict[str, List[str]],
        notes: List[str],
    ):
        self.primary = primary
        self.secondary = secondary
        self.confidence = confidence
        self.signals = signals
        self.notes = notes

    def as_dict(self) -> Dict:
        return {
            "primary_type": self.primary,
            "secondary_types": self.secondary,
            "confidence": round(self.confidence, 3),
            "confidence_label": confidence_label(self.confidence),
            "signals": self.signals,
            "notes": self.notes,
        }


def confidence_label(score: float) -> str:
    if score >= 0.75:
        return "high"
    if score >= 0.45:
        return "moderate"
    return "exploratory"


DATA_TYPE_CATALOG: Dict[str, Dict[str, List[str]]] = {
    "marketing_performance": {
        "columns": [
            "impression",
            "click",
            "ctr",
            "cpc",
            "cpm",
            "campaign",
            "adgroup",
            "roas",
            "conversion",
            "spend",
        ],
        "values": ["utm", "facebook", "google ads", "impr", "cpm"],
    },
    "technical_metrics": {
        "columns": [
            "latency",
            "throughput",
            "cpu",
            "memory",
            "utilization",
            "error_rate",
            "status_code",
            "requests",
            "apdex",
            "uptime",
        ],
        "values": ["ms", "timeout", "500", "502", "503"],
    },
    "correlation_outputs": {
        "columns": ["correlation", "rho", "coef", "p_value", "variable_a", "variable_b"],
        "values": ["pearson", "spearman", "kendall"],
    },
    "time_series_trends": {
        "columns": ["date", "timestamp", "time", "period", "week", "month", "year"],
        "values": [],
    },
    "forecast_prediction": {
        "columns": ["forecast", "prediction", "predicted", "lower", "upper", "horizon"],
        "values": ["forecast", "predicted", "confidence interval"],
    },
    "political_policy": {
        "columns": ["vote", "election", "party", "policy", "district", "ballot"],
        "values": ["senate", "house", "turnout", "incumbent"],
    },
    "financial_accounting": {
        "columns": [
            "revenue",
            "expense",
            "ebitda",
            "balance",
            "ledger",
            "invoice",
            "net_income",
            "ap",
            "ar",
            "cash_flow",
        ],
        "values": ["usd", "eur", "$", "balance sheet"],
    },
    "customer_behavior_logs": {
        "columns": ["event", "action", "session", "user_id", "device", "page", "ip"],
        "values": ["click", "view", "purchase", "login", "signup"],
    },
    "operational_supply_chain": {
        "columns": ["inventory", "shipment", "warehouse", "logistics", "vendor", "lead_time"],
        "values": ["po", "sku", "supply", "demand"],
    },
    "survey_qualitative": {
        "columns": ["response", "question", "rating", "survey", "likert", "comment", "sentiment"],
        "values": ["strongly agree", "strongly disagree", "nps"],
    },
    "geospatial_location": {
        "columns": ["latitude", "longitude", "lat", "lon", "geo", "city", "state", "country", "zip"],
        "values": [],
    },
    "experimental_ab_test": {
        "columns": ["variant", "treatment", "control", "experiment", "ab", "split"],
        "values": ["p-value", "uplift", "lift", "significance"],
    },
    "risk_compliance": {
        "columns": ["fraud", "risk", "compliance", "violation", "audit", "aml", "kyc", "alert", "breach"],
        "values": [],
    },
    "text_narrative": {
        "columns": ["text", "description", "summary", "content", "body"],
        "values": [],
    },
    "mixed_structured_unstructured": {
        "columns": [],
        "values": ["json", "{", "}"],
    },
}


def _match_signals(df: pd.DataFrame, category: str) -> Tuple[int, List[str]]:
    meta = DATA_TYPE_CATALOG[category]
    col_hits: List[str] = []
    value_hits: List[str] = []

    lower_cols = [str(c).lower() for c in df.columns]
    for key in meta.get("columns", []):
        if any(key in c for c in lower_cols):
            col_hits.append(key)

    sample_values = []
    try:
        sample_values = (
            df.select_dtypes(include=["object"])
            .astype(str)
            .stack()
            .sample(min(50, len(df) * max(1, len(df.columns))))
            .str.lower()
            .tolist()
        )
    except Exception:
        sample_values = []

    for token in meta.get("values", []):
        if any(token in str(val) for val in sample_values):
            value_hits.append(token)

    score = len(col_hits) * 2 + len(value_hits)
    signals = [f"columns:{','.join(col_hits)}" if col_hits else None, f"values:{','.join(value_hits)}" if value_hits else None]
    signals = [s for s in signals if s]
    return score, signals


def _text_dominant(df: pd.DataFrame) -> bool:
    text_cols = df.select_dtypes(include=["object"]).columns
    if not len(df.columns):
        return False
    long_text_cols = [c for c in text_cols if df[c].astype(str).str.len().mean() > 80]
    return len(long_text_cols) / max(len(df.columns), 1) >= 0.4


def classify_dataset(df: pd.DataFrame) -> DataTypeResult:
    scores: Dict[str, int] = {}
    signals: Dict[str, List[str]] = {}

    for category in DATA_TYPE_CATALOG:
        score, hits = _match_signals(df, category)
        scores[category] = score
        if hits:
            signals[category] = hits

    # Time series detection: datetime column + sorted index trend
    datetime_cols = [c for c in df.columns if "date" in c.lower() or "time" in c.lower()]
    if datetime_cols:
        scores["time_series_trends"] = scores.get("time_series_trends", 0) + 2

    # Text heavy detection
    if _text_dominant(df):
        scores["text_narrative"] = scores.get("text_narrative", 0) + 3

    # Mixed structure detection
    if df.select_dtypes(include=["object"]).shape[1] > 0 and df.select_dtypes(exclude=["object"]).shape[1] > 0:
        scores["mixed_structured_unstructured"] = scores.get("mixed_structured_unstructured", 0) + 1

    # Pick primary and secondary
    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    primary = "unknown"
    secondary: List[str] = []
    max_score = ranked[0][1] if ranked else 0
    if ranked and max_score > 0:
        primary = ranked[0][0]
        secondary = [k for k, v in ranked[1:] if v >= max(1, math.floor(max_score * 0.6))]

    confidence = 0.0 if max_score == 0 else min(1.0, max_score / 10.0)
    note_primary = f"Primary type inferred from column/value signals (score={max_score})." if max_score else "No strong signals detected."

    return DataTypeResult(primary, secondary, confidence, signals, [note_primary])










