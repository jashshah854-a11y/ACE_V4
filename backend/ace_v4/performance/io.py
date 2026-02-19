import os
from pathlib import Path
from typing import Iterator, Optional, Dict, Any, Union

import pandas as pd

from .config import PerformanceConfig


def _read_file(path: str, nrows: Optional[int] = None, **kwargs) -> pd.DataFrame:
    """Read any supported file format into a DataFrame."""
    ext = Path(path).suffix.lower()
    if ext in {".xls", ".xlsx"}:
        xl = pd.ExcelFile(path)
        sheet = xl.sheet_names[0]
        if len(xl.sheet_names) > 1:
            print(f"[IO] Excel file has {len(xl.sheet_names)} sheets: {xl.sheet_names}. Reading first: '{sheet}'")
        return xl.parse(sheet, nrows=nrows)
    elif ext == ".parquet":
        df = pd.read_parquet(path)
        return df.head(nrows) if nrows is not None else df
    elif ext in {".tsv", ".txt"}:
        return pd.read_csv(path, sep="\t", nrows=nrows, on_bad_lines="warn", engine="python", **kwargs)
    else:
        return pd.read_csv(path, nrows=nrows, on_bad_lines="warn", engine="python", **kwargs)


class ChunkedCSVReader:
    def __init__(self, config: Optional[PerformanceConfig] = None):
        self.config = config or PerformanceConfig()

    def _file_size_mb(self, path: str) -> float:
        try:
            size_bytes = os.path.getsize(path)
            return size_bytes / (1024 * 1024)
        except OSError:
            return 0.0

    def classify_size(self, path: str) -> str:
        size_mb = self._file_size_mb(path)
        if size_mb >= self.config.large_file_size_mb:
            return "large"
        return "normal"

    def sample_for_types(
        self,
        path: str,
        read_kwargs: Optional[Dict[str, Any]] = None
    ) -> pd.DataFrame:
        nrows = self.config.sample_rows_for_type_inference
        return _read_file(path, nrows=nrows)

    def infer_dtypes(self, sample: pd.DataFrame) -> Dict[str, Any]:
        inferred = {}
        for col in sample.columns:
            dtype = sample[col].dtype
            inferred[col] = dtype
        return inferred

    def read_full(
        self,
        path: str,
        read_kwargs: Optional[Dict[str, Any]] = None
    ) -> pd.DataFrame:
        return _read_file(path)

    def iter_chunks(
        self,
        path: str,
        read_kwargs: Optional[Dict[str, Any]] = None
    ) -> Iterator[pd.DataFrame]:
        ext = Path(path).suffix.lower()
        # Excel and Parquet don't support native chunked reading — load fully, yield in slices
        if ext in {".xls", ".xlsx", ".parquet"}:
            df = _read_file(path)
            chunk_size = self.config.chunk_size
            for start in range(0, len(df), chunk_size):
                yield df.iloc[start:start + chunk_size].copy()
            return

        # CSV/TSV: use pandas chunked reader
        sep = "\t" if ext in {".tsv", ".txt"} else ","
        read_kwargs = read_kwargs or {}
        reader = pd.read_csv(
            path,
            sep=sep,
            chunksize=self.config.chunk_size,
            on_bad_lines="warn",
            engine="python",
            **read_kwargs,
        )
        for chunk in reader:
            yield chunk

    def read_auto(
        self,
        path: str,
        read_kwargs: Optional[Dict[str, Any]] = None
    ) -> Union[pd.DataFrame, Iterator[pd.DataFrame]]:
        size_class = self.classify_size(path)
        if size_class == "normal":
            return self.read_full(path, read_kwargs)
        return self.iter_chunks(path, read_kwargs)
