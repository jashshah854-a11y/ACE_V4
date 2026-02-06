import os
from pathlib import Path
from typing import Optional

import pandas as pd

from .csv_defaults import PANDAS_CSV_KWARGS, POLARS_CSV_KWARGS

from ace_v4.performance.config import PerformanceConfig
from ace_v4.performance.io import ChunkedCSVReader


def smart_load_dataset(
    data_path: str,
    config: Optional[PerformanceConfig] = None,
    max_rows: Optional[int] = None,
) -> pd.DataFrame:
    """
    Intelligently load a dataset with automatic sampling for large files.

    Args:
        data_path: Path to the CSV file
        config: Performance configuration (uses defaults if None)
        max_rows: Maximum rows to load (uses config.max_analysis_rows if None)

    Returns:
        DataFrame with the loaded data

    Raises:
        FileNotFoundError: If data_path doesn't exist
    """
    if not Path(data_path).exists():
        raise FileNotFoundError(f"Dataset not found: {data_path}")

    config = config or PerformanceConfig()
    reader = ChunkedCSVReader(config)

    file_size_mb = os.path.getsize(data_path) / (1024 * 1024)
    size_class = reader.classify_size(data_path)

    max_rows = max_rows or config.max_analysis_rows

    if size_class == "large":
        print(f"[DataLoader] Large file detected ({file_size_mb:.1f} MB). Sampling {max_rows} rows for analysis.")
        df = pd.read_csv(data_path, nrows=max_rows)
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
