import os
from pathlib import Path
from typing import Dict, Optional, Tuple

import pandas as pd

from ace_v4.performance.config import PerformanceConfig
from ace_v4.performance.io import ChunkedCSVReader
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

    sample_path = Path(run_path) / "artifacts" / "sample.parquet"
    sample_df.to_parquet(sample_path, index=False)

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
    }
    return str(cleaned_path), meta

