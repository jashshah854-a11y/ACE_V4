from pathlib import Path
import hashlib
import duckdb
import polars as pl

import sys
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.csv_defaults import POLARS_CSV_KWARGS


def sha256_file(path: str, chunk_size: int = 8 * 1024 * 1024) -> str:
    """
    Compute a SHA-256 hash of a file for cache keys.
    """
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            b = f.read(chunk_size)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def build_sample_csv(path: str, n_rows: int) -> pl.DataFrame:
    """
    Read a small sample using polars without rewriting the file.
    """
    return pl.read_csv(
        path,
        n_rows=n_rows,
        infer_schema_length=min(n_rows, 2000),
        **POLARS_CSV_KWARGS,
    )


def csv_to_parquet_duckdb(csv_path: str, parquet_path: str) -> None:
    """
    Convert CSV to parquet via DuckDB COPY for fast downstream reads.
    """
    csv_p = Path(csv_path)
    parquet_p = Path(parquet_path)
    parquet_p.parent.mkdir(parents=True, exist_ok=True)

    con = duckdb.connect(database=":memory:")
    try:
        con.execute("PRAGMA threads=4")
        con.execute(
            "CREATE TABLE t AS SELECT * FROM read_csv_auto(?, SAMPLE_SIZE=-1)",
            [str(csv_p)],
        )
        con.execute(
            "COPY t TO ? (FORMAT PARQUET, COMPRESSION ZSTD)",
            [str(parquet_p)],
        )
    finally:
        con.close()

