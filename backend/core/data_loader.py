import os
from pathlib import Path
from typing import Optional

import pandas as pd
import polars as pl

from .csv_defaults import PANDAS_CSV_KWARGS, POLARS_CSV_KWARGS

from ace_v4.performance.config import PerformanceConfig
from ace_v4.performance.io import ChunkedCSVReader


def smart_load_dataset(
    data_path: str,
    config: Optional[PerformanceConfig] = None,
    max_rows: Optional[int] = None,
    fast_mode: bool = False,
    prefer_parquet: bool = True,
) -> pd.DataFrame:
    """
    Intelligently load a dataset with automatic sampling and parquet preference.

    - Parquet paths are loaded via polars and downsampled when fast_mode/max_rows is set.
    - CSV paths use polars read_csv for sampling; full reads fall back to ChunkedCSVReader.
    """
    if not Path(data_path).exists():
        raise FileNotFoundError(f"Dataset not found: {data_path}")

    config = config or PerformanceConfig()
    reader = ChunkedCSVReader(config)

    max_rows = max_rows or config.max_analysis_rows

    suffix = Path(data_path).suffix.lower()
    is_parquet = suffix == ".parquet"

    if is_parquet or prefer_parquet:
        if is_parquet:
            if fast_mode and max_rows:
                return pl.scan_parquet(data_path).fetch(max_rows).to_pandas()
            return pl.read_parquet(data_path).to_pandas()

    file_size_mb = os.path.getsize(data_path) / (1024 * 1024)
    size_class = reader.classify_size(data_path)

    if fast_mode or size_class == "large":
        rows_to_load = max_rows
        print(f"[DataLoader] Fast/large load ({file_size_mb:.1f} MB). Sampling {rows_to_load} rows.")
        df = pl.read_csv(
            data_path,
            n_rows=rows_to_load,
            **POLARS_CSV_KWARGS,
        ).to_pandas()
        print(f"[DataLoader] Loaded {len(df)} rows for analysis")
    else:
        print(f"[DataLoader] Loading full file ({file_size_mb:.1f} MB)")
        df = reader.read_full(data_path, read_kwargs=dict(PANDAS_CSV_KWARGS))
        print(f"[DataLoader] Loaded {len(df)} rows")

    return df


def calculate_file_timeout(data_path: str, config: Optional[PerformanceConfig] = None) -> int:
    """
    Calculate appropriate timeout for processing a file based on its size.

    Args:
        data_path: Path to the file
        config: Performance configuration (uses defaults if None)

    Returns:
        Timeout in seconds
    """
    config = config or PerformanceConfig()

    if not Path(data_path).exists():
        return config.base_timeout_seconds

    file_size_mb = os.path.getsize(data_path) / (1024 * 1024)

    timeout = config.base_timeout_seconds + int(file_size_mb * config.timeout_per_mb)

    return timeout
