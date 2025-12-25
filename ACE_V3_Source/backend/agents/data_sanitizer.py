import pandas as pd
from typing import Tuple, Dict, List


class DataSanitizer:
    """
    Safe mode cleaner.
    Tries to fix object columns, removes only columns that are completely unusable.
    """

    def sanitize(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        report: Dict[str, List[str] | int] = {
            "rows_before": len(df),
            "cols_before": df.shape[1],
            "multiline_columns": [],
            "numeric_converted": [],
            "dropped_all_null": [],
            "dropped_high_missing": [],
        }

        work = df.copy()

        # standard missing markers
        missing_tokens = [
            "",
            " ",
            "NA",
            "N A",
            "NaN",
            "nan",
            "None",
            "null",
            "Null",
            ".",
        ]
        work = work.replace(missing_tokens, pd.NA)

        # flatten multi line cells in object columns
        obj_cols = work.select_dtypes(include=["object"]).columns
        for col in obj_cols:
            if work[col].astype(str).str.contains("\n").any():
                work[col] = (
                    work[col]
                    .astype(str)
                    .str.replace("\r", " ", regex=False)
                    .str.replace("\n", " ", regex=False)
                )
                report["multiline_columns"].append(col)

        # try numeric coercion on object columns
        for col in list(work.columns):
            if work[col].dtype == "object":
                as_num = pd.to_numeric(work[col], errors="coerce")
                non_na_ratio = as_num.notna().mean()

                # if at least 60 percent of values convert, treat as numeric
                if non_na_ratio >= 0.6:
                    work[col] = as_num
                    report["numeric_converted"].append(col)

        # drop columns that are entirely missing after cleaning
        drop_all_null = [c for c in work.columns if work[c].notna().sum() == 0]
        if drop_all_null:
            work = work.drop(columns=drop_all_null)
            report["dropped_all_null"] = drop_all_null

        # drop columns with extremely high missing share
        high_missing = [
            c for c in work.columns if work[c].isna().mean() > 0.9
        ]
        if high_missing:
            work = work.drop(columns=high_missing)
            report["dropped_high_missing"] = high_missing

        report["rows_after"] = len(work)
        report["cols_after"] = work.shape[1]

        return work, report
