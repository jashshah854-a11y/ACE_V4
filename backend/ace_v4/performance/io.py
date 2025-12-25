import os
from typing import Iterator, Optional, Dict, Any, Union

import pandas as pd

from .config import PerformanceConfig


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
        read_kwargs = read_kwargs or {}
        nrows = self.config.sample_rows_for_type_inference

        sample = pd.read_csv(path, nrows=nrows, **read_kwargs)
        return sample

    def infer_dtypes(self, sample: pd.DataFrame) -> Dict[str, Any]:
        """
        Simple strategy:
        use pandas inference from sample,
        but you can plug in custom logic later.
        """
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
        """
        For normal sized files use a single read.
        """
        read_kwargs = read_kwargs or {}
        df = pd.read_csv(path, **read_kwargs)
        return df

    def iter_chunks(
        self,
        path: str,
        read_kwargs: Optional[Dict[str, Any]] = None
    ) -> Iterator[pd.DataFrame]:
        """
        Yield chunks for large files.
        """
        read_kwargs = read_kwargs or {}
        reader = pd.read_csv(
            path,
            chunksize=self.config.chunk_size,
            **read_kwargs
        )
        for chunk in reader:
            yield chunk

    def read_auto(
        self,
        path: str,
        read_kwargs: Optional[Dict[str, Any]] = None
    ) -> Union[pd.DataFrame, Iterator[pd.DataFrame]]:
        """
        Decide whether to return a full DataFrame or a chunk iterator.
        Upstream code can branch on isinstance(result, pd.DataFrame).
        """
        size_class = self.classify_size(path)

        if size_class == "normal":
            return self.read_full(path, read_kwargs)

        # Large file path
        return self.iter_chunks(path, read_kwargs)
