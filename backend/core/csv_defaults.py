"""Shared CSV parsing constants to keep reader behavior consistent."""

from typing import Dict, Sequence

# Common placeholder strings that should be treated as nulls
DEFAULT_NULL_SENTINELS: Sequence[str] = [
    "",
    " ",
    "-",
    "--",
    "---",
    "?",
    "NA",
    "na",
    "N/A",
    "n/a",
    "NULL",
    "null",
    "Null",
    "NONE",
    "none",
    "None",
    "NIL",
    "nil",
    "NaN",
    "nan",
    "UNKNOWN",
    "Unknown",
    "UNSPECIFIED",
    "unspecified",
    "TBD",
    "tbd",
    "__________",
]

POLARS_CSV_KWARGS: Dict[str, object] = {
    "null_values": list(DEFAULT_NULL_SENTINELS),
    "ignore_errors": True,
}

PANDAS_CSV_KWARGS: Dict[str, object] = {
    "na_values": list(DEFAULT_NULL_SENTINELS),
    "keep_default_na": True,
}
