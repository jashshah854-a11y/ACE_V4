import json
import os
from pathlib import Path
from typing import Dict, Optional, Tuple

import pandas as pd

from ace_v4.performance.config import PerformanceConfig
from ace_v4.performance.io import ChunkedCSVReader
from intake.profiling import profile_dataframe, compute_drift_report, compute_sample_drift, compute_recency_drift, save_json
from jobs.progress import ProgressTracker


def _ensure_dirs(run_path: str):
    Path(run_path).mkdir(parents=True, exist_ok=True)
    Path(run_path, "artifacts").mkdir(parents=True, exist_ok=True)
    Path(run_path, "cache").mkdir(parents=True, exist_ok=True)


def _coerce_datetime(series: pd.Series) -> pd.Series:
    version_parts = pd.__version__.split(".")
    try:
        major = int(version_parts[0])
    except ValueError:
        major = 0
    if major >= 2:
        return pd.to_datetime(series, errors="coerce", utc=False, format="mixed")
    with warnings.catch_warnings():
        warnings.filterwarnings(
            "ignore",
            message="Could not infer format",
            category=UserWarning,
        )
        return pd.to_datetime(series, errors="coerce", utc=False)


def _is_datetime_candidate(column_name: str) -> bool:
    name = column_name.lower()
    tokens = (
        "date",
        "time",
        "timestamp",
        "year",
        "month",
        "day",
        "created",
        "updated",
        "joined",
    )
    return any(token in name for token in tokens)


_DATE_LIKE_PATTERN = re.compile(
    r"\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b",
    flags=re.IGNORECASE,
)


def _datetime_like_fraction(series: pd.Series, sample_size: int = 50) -> tuple[float, int]:
    sample = series.dropna().astype(str).head(sample_size)
    if sample.empty:
        return 0.0, 0
    matches = sample.str.contains(_DATE_LIKE_PATTERN, na=False)
    count = int(matches.sum())
    return count / len(sample), count


def _datetime_candidate_values(series: pd.Series) -> pd.Series:
    values = series.dropna().astype(str)
    if values.empty:
        return values
    return values[values.str.contains(_DATE_LIKE_PATTERN, na=False)]


def prepare_run_data(
    upload_path: str,
    run_path: str,
    progress: Optional[ProgressTracker] = None,
    config: Optional[PerformanceConfig] = None,
) -> Tuple[str, Dict]:
    """
    Prepare dataset for a run:
    - sample for type inference and quick inspection
    - stream the full file into cleaned_uploaded.csv with chunking
    Returns path to cleaned CSV and metadata (sample path, dtypes, rows).
    """
    cfg = config or PerformanceConfig()
    reader = ChunkedCSVReader(cfg)
    _ensure_dirs(run_path)

    if progress:
        progress.update(
            "ingestion",
            {
                "status": "sampling",
                "source": upload_path,
                "file_mb": round(os.path.getsize(upload_path) / (1024 * 1024), 2),
            },
        )

    sample_df = reader.sample_for_types(upload_path)
    dtypes = reader.infer_dtypes(sample_df)

    artifacts_dir = Path(run_path) / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    sample_path = artifacts_dir / "sample.parquet"
    sample_df.to_parquet(sample_path, index=False)

    # Profile current sample
    current_profile = profile_dataframe(sample_df)
    schema_profile_path = artifacts_dir / "schema_profile.json"
    save_json(schema_profile_path, current_profile)

    # Baseline profile (first good run)
    baseline_path = artifacts_dir / "baseline_profile.json"
    if baseline_path.exists():
        with open(baseline_path, "r", encoding="utf-8") as f:
            baseline_profile = json.load(f)
    else:
        baseline_profile = current_profile
        save_json(baseline_path, baseline_profile)

    # Drift report (lightweight profile drift)
    drift_report = compute_drift_report(
        baseline_profile,
        current_profile,
        psi_warn=0.1,
        psi_block=0.25,
        cat_warn=0.1,
    )
    # Stronger sample drift if baseline sample exists
    baseline_sample_path = artifacts_dir / "baseline_sample.parquet"
    if baseline_sample_path.exists():
        try:
            baseline_sample_df = pd.read_parquet(baseline_sample_path)
            sample_drift = compute_sample_drift(
                baseline_sample_df,
                sample_df,
                psi_warn=0.1,
                psi_block=0.25,
                cat_warn=0.1,
            )
            drift_report["sample_drift"] = sample_drift
            if sample_drift.get("status") in {"warn", "block"}:
                drift_report["status"] = sample_drift["status"]
        except Exception as e:
            drift_report.setdefault("summary", []).append(f"Sample drift check failed: {e}")
    else:
        # Write baseline sample on first run
        sample_df.to_parquet(baseline_sample_path, index=False)

    # Recency drift if time column present (compare last N rows to first N rows)
    time_cols = [c for c in sample_df.columns if "date" in c.lower() or "time" in c.lower()]
    if time_cols and len(sample_df) >= 40:
        head_df = sample_df.head(20)
        tail_df = sample_df.tail(20)
        recency = compute_recency_drift(
            tail_df,
            head_df,
            psi_warn=0.1,
            psi_block=0.25,
            cat_warn=0.1,
        )
        drift_report["recency_drift"] = recency
        if recency.get("status") in {"warn", "block"}:
            drift_report["status"] = recency["status"]

    drift_report_path = artifacts_dir / "drift_report.json"
    save_json(drift_report_path, drift_report)

    # Coercion/parse health on sample (object columns)
    coercion = {}
    object_cols = sample_df.select_dtypes(include=["object"]).columns
    for col in object_cols:
        series = sample_df[col].astype(str)
        numeric_coerced = pd.to_numeric(series, errors="coerce")
        num_rate = 1 - numeric_coerced.isna().mean()

        dt_rate = None
        if _is_datetime_candidate(col):
            dt_candidates = _datetime_candidate_values(series)
            if not dt_candidates.empty:
                dt_coerced = _coerce_datetime(dt_candidates)
                dt_rate = 1 - dt_coerced.isna().mean()
        else:
            fraction, count = _datetime_like_fraction(series)
            if fraction >= 0.2 and count >= 3:
                dt_candidates = _datetime_candidate_values(series)
                if not dt_candidates.empty:
                    dt_coerced = _coerce_datetime(dt_candidates)
                    dt_rate = 1 - dt_coerced.isna().mean()

        coercion[col] = {
            "numeric_parse_rate": round(float(num_rate), 3),
            "datetime_parse_rate": round(float(dt_rate), 3) if dt_rate is not None else None,
        }

    coercion_path = artifacts_dir / "coercion_report.json"
    save_json(coercion_path, {"columns": coercion})

    cleaned_path = Path(run_path) / "cleaned_uploaded.csv"
    total_rows = 0
    chunks = 0

    if progress:
        progress.update(
            "ingestion",
            {
                "status": "streaming",
                "sample_rows": len(sample_df),
                "dtype_columns": len(dtypes),
            },
        )

    for idx, chunk in enumerate(reader.iter_chunks(upload_path)):
        write_header = idx == 0
        chunk.to_csv(cleaned_path, mode="w" if write_header else "a", index=False, header=write_header)
        total_rows += len(chunk)
        chunks += 1
        if progress and idx % 1 == 0:
            progress.update(
                "ingestion",
                {
                    "status": "streaming",
                    "chunks_written": chunks,
                    "rows_processed": total_rows,
                },
            )

    if progress:
        progress.update(
            "ingestion",
            {
                "status": "completed",
                "chunks_written": chunks,
                "rows_processed": total_rows,
                "sample_path": str(sample_path),
            },
        )

    meta = {
        "sample_path": str(sample_path),
        "dtypes": {k: str(v) for k, v in dtypes.items()},
        "rows": total_rows,
        "schema_profile": str(schema_profile_path),
        "drift_report": str(drift_report_path),
        "drift_status": drift_report.get("status", "none"),
        "coercion_report": str(coercion_path),
    }
    return str(cleaned_path), meta






