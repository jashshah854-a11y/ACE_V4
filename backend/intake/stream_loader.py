import json
import os
import shutil
from pathlib import Path
from typing import Dict, Optional, Tuple

import pandas as pd

from ace_v4.performance.config import PerformanceConfig
from intake.fast_ingest import build_sample_csv, csv_to_parquet_duckdb, sha256_file
from intake.profiling import profile_dataframe, compute_drift_report, compute_sample_drift, compute_recency_drift, save_json
from jobs.progress import ProgressTracker


def _ensure_dirs(run_path: str):
    Path(run_path).mkdir(parents=True, exist_ok=True)
    Path(run_path, "artifacts").mkdir(parents=True, exist_ok=True)
    Path(run_path, "cache").mkdir(parents=True, exist_ok=True)


def prepare_run_data(
    upload_path: str,
    run_path: str,
    progress: Optional[ProgressTracker] = None,
    config: Optional[PerformanceConfig] = None,
    fast_mode: Optional[bool] = None,
) -> Tuple[str, Dict]:
    """
    Prepare dataset for a run without rewriting the CSV:
    - sample for type inference and profiling
    - optionally convert to parquet (full mode)
    - emit dataset_manifest.json for downstream agents
    Returns manifest path and ingestion metadata.
    """
    cfg = config or PerformanceConfig()
    _ensure_dirs(run_path)

    file_mb = round(os.path.getsize(upload_path) / (1024 * 1024), 2)
    fast = fast_mode if fast_mode is not None else file_mb >= 25
    code_version = "ingest-fast-v1"
    file_hash = sha256_file(upload_path)
    cache_dir = Path("data") / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_base = f"{file_hash}_{'fast' if fast else 'full'}_{code_version}"

    if progress:
        progress.update(
            "ingestion",
            {
                "status": "sampling",
                "source": upload_path,
                "file_mb": file_mb,
                "fast_mode": fast,
            },
        )

    # Build sample with polars (no rewrite)
    sample_rows = cfg.sample_rows_for_type_inference
    sample_cache = cache_dir / f"{cache_base}_sample.parquet"
    if sample_cache.exists():
        sample_df = pd.read_parquet(sample_cache)
        sample_pl = None
    else:
        sample_pl = build_sample_csv(upload_path, n_rows=sample_rows)
        sample_df = sample_pl.to_pandas()
    dtypes = {col: str(dtype) for col, dtype in sample_df.dtypes.items()}

    artifacts_dir = Path(run_path) / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    sample_path = artifacts_dir / "sample.parquet"
    if sample_pl is not None:
        sample_pl.write_parquet(sample_path)
        try:
            shutil.copy(sample_path, sample_cache)
        except Exception:
            pass
    else:
        shutil.copy(sample_cache, sample_path)

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
        pd.DataFrame(sample_df).to_parquet(baseline_sample_path, index=False)

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

        dt_coerced = pd.to_datetime(series, errors="coerce", utc=False, format=None)
        dt_rate = 1 - dt_coerced.isna().mean()

        coercion[col] = {
            "numeric_parse_rate": round(float(num_rate), 3),
            "datetime_parse_rate": round(float(dt_rate), 3),
        }

    coercion_path = artifacts_dir / "coercion_report.json"
    save_json(coercion_path, {"columns": coercion})

    # Optionally convert to parquet for full mode; avoid streaming rewrite
    parquet_path = None
    if not fast:
        parquet_path = artifacts_dir / "dataset.parquet"
        parquet_cache = cache_dir / f"{cache_base}.parquet"
        if parquet_cache.exists():
            shutil.copy(parquet_cache, parquet_path)
        else:
            csv_to_parquet_duckdb(upload_path, parquet_path)
            try:
                shutil.copy(parquet_path, parquet_cache)
            except Exception:
                pass

    manifest = {
        "source_path": str(Path(upload_path).resolve()),
        "parquet_path": str(parquet_path.resolve()) if parquet_path else None,
        "sample_parquet_path": str(sample_path.resolve()),
        "row_count_estimate": len(sample_df),
        "columns": list(sample_df.columns),
        "fast_mode_used": fast,
        "sha256": file_hash,
        "cache_key": cache_base,
    }
    manifest_path = artifacts_dir / "dataset_manifest.json"
    save_json(manifest_path, manifest)

    if progress:
        progress.update(
            "ingestion",
            {
                "status": "completed",
                "sample_rows": len(sample_df),
                "dtype_columns": len(dtypes),
                "manifest": str(manifest_path),
            },
        )

    meta = {
        "sample_path": str(sample_path),
        "dtypes": dtypes,
        "rows": len(sample_df),
        "schema_profile": str(schema_profile_path),
        "drift_report": str(drift_report_path),
        "drift_status": drift_report.get("status", "none"),
        "coercion_report": str(coercion_path),
        "dataset_manifest": str(manifest_path),
        "fast_mode": fast,
    }
    return str(manifest_path), meta






