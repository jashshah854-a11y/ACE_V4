import warnings

import pandas as pd

from intake.stream_loader import (
    _datetime_candidate_values,
    _datetime_like_fraction,
    _is_datetime_candidate,
)


def test_datetime_candidate_values_filters_non_dates():
    series = pd.Series(["11:11 CAFE", "not a date", "2023-01-02", "01/03/24"])
    candidates = _datetime_candidate_values(series)
    assert "2023-01-02" in set(candidates)
    assert "01/03/24" in set(candidates)
    assert "11:11 CAFE" not in set(candidates)
    assert "not a date" not in set(candidates)


def test_datetime_like_fraction_reports_counts():
    series = pd.Series(
        ["2023-01-02", "01/03/24", "nope", "still nope", "2024-12-31"]
    )
    fraction, count = _datetime_like_fraction(series, sample_size=10)
    assert count == 3
    assert fraction == 3 / 5


def test_datetime_like_helpers_do_not_emit_regex_group_warning():
    series = pd.Series(["2023-01-02", "11:11 CAFE", "nope"])
    with warnings.catch_warnings(record=True) as captured:
        warnings.simplefilter("always")
        _datetime_like_fraction(series)
        _datetime_candidate_values(series)
    assert not any(
        "match groups" in str(warning.message) for warning in captured
    )


def test_datetime_candidate_name_detection():
    assert _is_datetime_candidate("created_at")
    assert _is_datetime_candidate("order_date")
    assert not _is_datetime_candidate("restaurant_name")
