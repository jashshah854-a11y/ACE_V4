import sys
from pathlib import Path
from typing import Dict, Any

import pandas as pd

sys.path.append(str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from core.datetime_utils import coerce_datetime


MIN_SAMPLE_SIZE = 50
MIN_VARIANCE = 1e-6
MIN_TIME_SPAN_DAYS = 7


def detect_target_column(df: pd.DataFrame) -> str | None:
    candidates = ["target", "label", "outcome", "y", "kpi", "goal", "response"]
    for col in df.columns:
        cl = str(col).lower()
        if any(c in cl.split() or c in cl.replace("_", " ") for c in candidates):
            return col
    return None


def detect_time_column(df: pd.DataFrame) -> str | None:
    for col in df.columns:
        series = df[col]
        if pd.api.types.is_datetime64_any_dtype(series):
            return col
        if any(k in str(col).lower() for k in ["date", "time", "timestamp"]):
            try:
                pd.to_datetime(series, errors="raise")
                return col
            except Exception:
                continue
    return None


def evaluate_variance(df: pd.DataFrame) -> bool:
    numeric = df.select_dtypes(include=["number"])
    if numeric.empty:
        return False
    return any(numeric.std(numeric_only=True, ddof=0) > MIN_VARIANCE)


def main():
    if len(sys.argv) < 2:
        print("Usage: python data_validation.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)
    data_path = state.get_file_path("cleaned_uploaded.csv")

    if not Path(data_path).exists():
        state.write("data_validation_report", {"can_proceed": False, "reason": "missing_dataset"})
        print("[DATA_VALIDATION] Missing dataset.")
        sys.exit(1)

    df = pd.read_csv(data_path)

    report: Dict[str, Any] = {
        "row_count": len(df),
        "column_count": len(df.columns),
        "checks": {},
        "can_proceed": True,
        "mode": "insight",
    }

    # Target presence
    target_col = detect_target_column(df)
    report["checks"]["target_present"] = bool(target_col)
    report["target_column"] = target_col

    # Sample size
    report["checks"]["sample_sufficient"] = len(df) >= MIN_SAMPLE_SIZE

    # Variance
    report["checks"]["variance_ok"] = evaluate_variance(df)

    # Time coverage
    time_col = detect_time_column(df)
    if time_col:
        try:
            ts = coerce_datetime(df[time_col]).dropna()
            span_days = (ts.max() - ts.min()).days if not ts.empty else 0
        except Exception:
            span_days = 0
        report["time_column"] = time_col
        report["checks"]["time_coverage_ok"] = span_days >= MIN_TIME_SPAN_DAYS
        report["time_span_days"] = span_days
    else:
        report["checks"]["time_coverage_ok"] = True  # not required if no time dimension

    # Observational vs causal
    causal_cols = [c for c in df.columns if any(k in str(c).lower() for k in ["variant", "treatment", "control", "experiment", "ab", "group"])]
    report["causal_signals"] = causal_cols
    report["checks"]["causal_candidate"] = len(causal_cols) > 0

    # Decide if insights are allowed
    critical = [
        report["checks"]["sample_sufficient"],
        report["checks"]["variance_ok"],
    ]
    if not all(critical) or not report["checks"]["target_present"]:
        report["can_proceed"] = False
        report["mode"] = "limitations"

    if not report["can_proceed"]:
        report["limitations"] = []
        if not report["checks"]["target_present"]:
            report["limitations"].append("Target variable not detected; cannot model outcomes.")
        if not report["checks"]["sample_sufficient"]:
            report["limitations"].append(f"Sample size {len(df)} below minimum {MIN_SAMPLE_SIZE}.")
        if not report["checks"]["variance_ok"]:
            report["limitations"].append("Insufficient variance in numeric fields.")
        if not report["checks"]["time_coverage_ok"]:
            span = report.get("time_span_days", 0)
            report["limitations"].append(f"Time coverage too short ({span} days).")

    state.write("validation_report", report)
    state.write("data_validation_report", report)
    print(f"[DATA_VALIDATION] can_proceed={report['can_proceed']} mode={report['mode']}")
    if not report["can_proceed"]:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()

