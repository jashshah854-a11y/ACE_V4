import sys
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd

sys.path.append(str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from core.data_guardrails import SUPPORTED_DATA_TYPES
from core.data_loader import smart_load_dataset
from ace_v4.performance.config import PerformanceConfig


DATA_TYPE_KEYWORDS: Dict[str, List[str]] = {
    "marketing_performance": ["cpc", "ctr", "impressions", "clicks", "campaign", "adgroup", "roas", "spend"],
    "technical_metrics": ["cpu", "memory", "latency", "throughput", "qps", "error_rate", "requests", "status_code"],
    "correlation_outputs": ["correlation", "pearson", "spearman", "covariance", "p-value", "r_value"],
    "time_series_trends": ["date", "timestamp", "time", "day", "week", "month", "year"],
    "forecast_prediction": ["forecast", "prediction", "predicted", "projection", "upper", "lower", "confidence"],
    "political_policy": ["election", "vote", "policy", "bill", "senate", "house", "candidate", "approval"],
    "financial_accounting": ["revenue", "expense", "profit", "balance", "ledger", "account", "invoice", "payable"],
    "customer_behavior": ["user_id", "customer_id", "session", "event", "page", "action", "transaction"],
    "operational_supply_chain": ["inventory", "shipment", "logistics", "warehouse", "sku", "lead_time", "supplier"],
    "survey_qualitative": ["survey", "response", "rating", "question", "comment", "nps", "likert"],
    "geospatial": ["latitude", "longitude", "lat", "lon", "geo", "location"],
    "experimental_ab_test": ["variant", "control", "treatment", "experiment", "ab", "split", "bucket"],
    "risk_compliance": ["risk", "compliance", "policy", "control", "audit", "breach", "exposure"],
    "text_narrative": ["summary", "text", "description", "notes", "commentary", "narrative"],
}


def score_data_types(df: pd.DataFrame) -> List[Tuple[str, int]]:
    columns = [c.lower() for c in df.columns]
    scores: List[Tuple[str, int]] = []
    for dtype, keywords in DATA_TYPE_KEYWORDS.items():
        score = 0
        for col in columns:
            score += sum(1 for kw in keywords if kw in col)
        scores.append((dtype, score))
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores


def detect_time_signal(df: pd.DataFrame) -> bool:
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]) or "date" in str(col).lower() or "time" in str(col).lower():
            return True
    return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python data_typing.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)
    dataset_info = state.read("active_dataset") or {}
    data_path = dataset_info.get("path") or state.get_file_path("cleaned_uploaded.csv")

    if not data_path or not Path(data_path).exists():
        print(f"[DATA_TYPING] Missing dataset at {data_path}")
        state.write("data_type", {"primary_type": "unknown", "confidence": "low", "reason": "missing_dataset"})
        sys.exit(1)

    run_config = state.read("run_config") or {}
    ingestion_meta = state.read("ingestion_meta") or {}
    fast_mode = bool(run_config.get("fast_mode", ingestion_meta.get("fast_mode", False)))
    df = smart_load_dataset(
        data_path,
        config=PerformanceConfig(),
        max_rows=5000,
        fast_mode=fast_mode,
        prefer_parquet=True,
    )

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

