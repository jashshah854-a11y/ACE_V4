import pandas as pd

from intake.fast_ingest import build_sample_csv
from core.data_loader import smart_load_dataset


CSV_CONTENT = """PHONE,VALUE\n1234567890,10\n__________,20\n5558881212,30\n""".strip()


def _write_csv(tmp_path):
    path = tmp_path / "placeholder.csv"
    path.write_text(CSV_CONTENT)
    return path


def test_build_sample_csv_handles_placeholder_nulls(tmp_path):
    csv_path = _write_csv(tmp_path)
    df = build_sample_csv(str(csv_path), n_rows=10)
    values = df["PHONE"].to_list()
    assert values[1] is None


def test_smart_load_dataset_fast_mode_handles_placeholder(tmp_path):
    csv_path = _write_csv(tmp_path)
    df = smart_load_dataset(
        str(csv_path),
        fast_mode=True,
        max_rows=10,
        prefer_parquet=False,
    )
    assert pd.isna(df.loc[1, "PHONE"])
