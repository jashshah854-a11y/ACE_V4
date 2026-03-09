"""Time series analysis utilities for ACE V4."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy import stats as sp_stats


@dataclass
class TimeSeriesConfig:
    max_lags: int = 40
    forecast_horizon: int = 12
    seasonal_periods: Optional[int] = None  # auto-detect if None
    significance_level: float = 0.05


def detect_datetime_column(df: pd.DataFrame) -> Optional[str]:
    """Find the best datetime column in a DataFrame."""
    # First: existing datetime64 columns
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            return col

    # Second: columns with date/time names that can be parsed
    date_keywords = {"date", "time", "timestamp", "datetime", "created", "updated", "period"}
    for col in df.columns:
        col_lower = col.lower().replace("_", "").replace("-", "")
        if any(kw in col_lower for kw in date_keywords):
            try:
                parsed = pd.to_datetime(df[col], errors="coerce", format="mixed")
                if parsed.notna().sum() > len(df) * 0.5:
                    return col
            except Exception:
                continue

    return None


def detect_numeric_targets(df: pd.DataFrame, datetime_col: str, max_targets: int = 5) -> List[str]:
    """Find numeric columns suitable for time series analysis."""
    targets = []
    for col in df.columns:
        if col == datetime_col:
            continue
        if pd.api.types.is_numeric_dtype(df[col]):
            non_null = df[col].notna().sum()
            unique_ratio = df[col].nunique() / max(non_null, 1)
            # Skip constants (near-zero cardinality)
            if unique_ratio < 0.01:
                continue
            # Skip ID-like integer columns (very high cardinality integers)
            if unique_ratio > 0.95 and pd.api.types.is_integer_dtype(df[col]):
                continue
            targets.append(col)

    # Prioritize columns with value-like names
    priority_keywords = {"value", "amount", "revenue", "sales", "count", "price", "total", "quantity", "volume"}
    targets.sort(key=lambda c: (
        0 if any(kw in c.lower() for kw in priority_keywords) else 1,
        -df[c].notna().sum(),
    ))
    return targets[:max_targets]


def compute_time_series_analysis(
    df: pd.DataFrame,
    config: TimeSeriesConfig | None = None,
    datetime_col: Optional[str] = None,
    target_cols: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Run time series analysis on a DataFrame.

    Returns a dict with stationarity tests, seasonal decomposition,
    autocorrelation analysis, trend detection, and basic forecast.
    """
    config = config or TimeSeriesConfig()

    # Detect datetime column
    if datetime_col is None:
        datetime_col = detect_datetime_column(df)
    if datetime_col is None:
        return {"status": "skipped", "reason": "No datetime column detected."}

    # Parse datetime
    df = df.copy()
    try:
        df[datetime_col] = pd.to_datetime(df[datetime_col], errors="coerce", format="mixed")
    except Exception:
        return {"status": "skipped", "reason": f"Could not parse datetime column '{datetime_col}'."}

    df = df.dropna(subset=[datetime_col]).sort_values(datetime_col).reset_index(drop=True)
    if len(df) < 20:
        return {"status": "skipped", "reason": "Insufficient time series data (need at least 20 rows)."}

    # Detect target columns
    if target_cols is None:
        target_cols = detect_numeric_targets(df, datetime_col)
    if not target_cols:
        return {"status": "skipped", "reason": "No suitable numeric columns for time series analysis."}

    # Detect frequency
    freq_info = _detect_frequency(df[datetime_col])

    # Auto-detect seasonal period
    seasonal_period = config.seasonal_periods
    if seasonal_period is None:
        seasonal_period = _infer_seasonal_period(freq_info.get("inferred_freq"))

    results: Dict[str, Any] = {
        "status": "ok",
        "datetime_column": datetime_col,
        "date_range": {
            "start": str(df[datetime_col].min()),
            "end": str(df[datetime_col].max()),
            "n_observations": len(df),
        },
        "frequency": freq_info,
        "seasonal_period": seasonal_period,
        "analyses": {},
    }

    for col in target_cols:
        series = df.set_index(datetime_col)[col].dropna()
        if len(series) < 20:
            continue
        analysis = _analyze_single_series(series, col, config, seasonal_period)
        results["analyses"][col] = analysis

    if not results["analyses"]:
        return {"status": "skipped", "reason": "No columns had sufficient non-null time series data."}

    # Generate insights
    results["insights"] = _generate_insights(results)

    return results


def _detect_frequency(dt_series: pd.Series) -> Dict[str, Any]:
    """Detect the time frequency of the series."""
    diffs = dt_series.diff().dropna()
    if len(diffs) == 0:
        return {"inferred_freq": "unknown", "median_gap_days": None}

    median_gap = diffs.median()
    median_days = median_gap.total_seconds() / 86400

    if median_days < 0.042:  # < 1 hour
        freq = "minutely"
    elif median_days < 0.5:
        freq = "hourly"
    elif median_days < 2:
        freq = "daily"
    elif median_days < 10:
        freq = "weekly"
    elif median_days < 45:
        freq = "monthly"
    elif median_days < 120:
        freq = "quarterly"
    else:
        freq = "yearly"

    return {
        "inferred_freq": freq,
        "median_gap_days": round(float(median_days), 2),
        "min_gap_days": round(float(diffs.min().total_seconds() / 86400), 2),
        "max_gap_days": round(float(diffs.max().total_seconds() / 86400), 2),
        "is_regular": bool(diffs.std().total_seconds() / max(median_gap.total_seconds(), 1) < 0.1),
    }


def _infer_seasonal_period(freq: Optional[str]) -> int:
    """Map frequency to a reasonable seasonal period."""
    mapping = {
        "minutely": 60,
        "hourly": 24,
        "daily": 7,
        "weekly": 52,
        "monthly": 12,
        "quarterly": 4,
        "yearly": 1,
    }
    return mapping.get(freq or "", 12)


def _analyze_single_series(
    series: pd.Series,
    col_name: str,
    config: TimeSeriesConfig,
    seasonal_period: int,
) -> Dict[str, Any]:
    """Analyze a single time series column."""
    values = series.values.astype(float)
    n = len(values)

    result: Dict[str, Any] = {
        "n_observations": n,
        "basic_stats": {
            "mean": float(np.nanmean(values)),
            "std": float(np.nanstd(values)),
            "min": float(np.nanmin(values)),
            "max": float(np.nanmax(values)),
            "cv": float(np.nanstd(values) / max(abs(np.nanmean(values)), 1e-10)),
        },
    }

    # Stationarity test (Augmented Dickey-Fuller)
    result["stationarity"] = _test_stationarity(values, config.significance_level)

    # Trend detection
    result["trend"] = _detect_trend(values)

    # Autocorrelation
    max_lags = min(config.max_lags, n // 3)
    result["autocorrelation"] = _compute_autocorrelation(values, max_lags)

    # Seasonal decomposition (if enough data)
    if n >= seasonal_period * 2:
        result["seasonality"] = _decompose_seasonality(series, seasonal_period)

    # Volatility clustering
    result["volatility"] = _analyze_volatility(values)

    # Change point detection (simple)
    result["change_points"] = _detect_change_points(values, series.index)

    # Simple forecast (exponential smoothing)
    if n >= 10:
        result["forecast"] = _simple_forecast(
            series, config.forecast_horizon, seasonal_period
        )

    return result


def _test_stationarity(values: np.ndarray, alpha: float = 0.05) -> Dict[str, Any]:
    """Run ADF test for stationarity."""
    try:
        from statsmodels.tsa.stattools import adfuller
        result = adfuller(values, autolag="AIC")
        return {
            "adf_statistic": round(float(result[0]), 4),
            "p_value": round(float(result[1]), 6),
            "is_stationary": bool(result[1] < alpha),
            "critical_values": {k: round(float(v), 4) for k, v in result[4].items()},
            "n_lags_used": int(result[2]),
        }
    except Exception as e:
        return {"error": str(e), "is_stationary": None}


def _detect_trend(values: np.ndarray) -> Dict[str, Any]:
    """Detect linear trend using OLS."""
    n = len(values)
    x = np.arange(n)
    slope, intercept, r_value, p_value, std_err = sp_stats.linregress(x, values)

    # Mann-Kendall-like direction assessment
    if p_value < 0.05:
        if slope > 0:
            direction = "increasing"
        else:
            direction = "decreasing"
    else:
        direction = "no_significant_trend"

    # Percentage change over the series
    if abs(intercept) > 1e-10:
        pct_change = float((slope * n) / abs(intercept) * 100)
    else:
        pct_change = 0.0

    return {
        "direction": direction,
        "slope": round(float(slope), 6),
        "r_squared": round(float(r_value ** 2), 4),
        "p_value": round(float(p_value), 6),
        "total_pct_change": round(pct_change, 2),
    }


def _compute_autocorrelation(values: np.ndarray, max_lags: int) -> Dict[str, Any]:
    """Compute autocorrelation function."""
    try:
        from statsmodels.tsa.stattools import acf, pacf

        acf_values = acf(values, nlags=max_lags, fft=True)
        # PACF can fail on short series
        try:
            pacf_values = pacf(values, nlags=min(max_lags, len(values) // 2 - 1))
        except Exception:
            pacf_values = None

        # Significance threshold (approximate 95% CI)
        sig_threshold = 1.96 / np.sqrt(len(values))

        # Find significant lags
        significant_lags = [
            int(i) for i in range(1, len(acf_values))
            if abs(acf_values[i]) > sig_threshold
        ]

        return {
            "acf_values": [round(float(v), 4) for v in acf_values[:min(20, len(acf_values))]],
            "pacf_values": [round(float(v), 4) for v in pacf_values[:min(20, len(pacf_values))]] if pacf_values is not None else None,
            "significant_lags": significant_lags[:10],
            "first_significant_lag": significant_lags[0] if significant_lags else None,
            "lag1_autocorrelation": round(float(acf_values[1]), 4) if len(acf_values) > 1 else None,
        }
    except Exception as e:
        return {"error": str(e)}


def _decompose_seasonality(series: pd.Series, period: int) -> Dict[str, Any]:
    """Decompose series into trend, seasonal, and residual."""
    try:
        from statsmodels.tsa.seasonal import seasonal_decompose

        # Use additive if values are all positive and low CV; multiplicative otherwise
        values = series.values.astype(float)
        model_type = "additive"
        if np.all(values > 0) and np.std(values) / np.mean(values) > 0.3:
            model_type = "multiplicative"

        decomposition = seasonal_decompose(
            series, model=model_type, period=period, extrapolate_trend="freq"
        )

        seasonal = decomposition.seasonal
        resid = decomposition.resid.dropna()

        # Seasonal strength: 1 - Var(residual) / Var(deseasonalized)
        deseasonalized = series - seasonal
        seasonal_strength = max(0, 1 - float(resid.var() / max(deseasonalized.var(), 1e-10)))

        # Extract one seasonal cycle pattern
        cycle = seasonal.iloc[:period].values

        return {
            "model": model_type,
            "period": period,
            "seasonal_strength": round(float(seasonal_strength), 4),
            "has_seasonality": bool(seasonal_strength > 0.1),
            "seasonal_pattern": [round(float(v), 4) for v in cycle],
            "residual_std": round(float(resid.std()), 4),
        }
    except Exception as e:
        return {"error": str(e), "has_seasonality": None}


def _analyze_volatility(values: np.ndarray) -> Dict[str, Any]:
    """Analyze volatility patterns."""
    if len(values) < 10:
        return {"error": "Too few values"}

    returns = np.diff(values) / np.maximum(np.abs(values[:-1]), 1e-10)

    # Rolling volatility (window = 20% of series length)
    window = max(5, len(returns) // 5)
    rolling_std = pd.Series(returns).rolling(window=window).std().dropna().values

    if len(rolling_std) < 2:
        return {"constant": True, "mean_volatility": round(float(np.std(returns)), 4)}

    # Check if volatility is increasing
    vol_trend = sp_stats.linregress(np.arange(len(rolling_std)), rolling_std)

    return {
        "mean_volatility": round(float(np.std(returns)), 4),
        "volatility_trend": "increasing" if vol_trend.pvalue < 0.05 and vol_trend.slope > 0
            else "decreasing" if vol_trend.pvalue < 0.05 and vol_trend.slope < 0
            else "stable",
        "max_drawdown_pct": round(float(_max_drawdown(values) * 100), 2),
    }


def _max_drawdown(values: np.ndarray) -> float:
    """Compute maximum drawdown."""
    peak = values[0]
    max_dd = 0.0
    for v in values[1:]:
        if v > peak:
            peak = v
        dd = (peak - v) / max(abs(peak), 1e-10)
        if dd > max_dd:
            max_dd = dd
    return float(max_dd)


def _detect_change_points(values: np.ndarray, index: pd.Index) -> Dict[str, Any]:
    """Simple change point detection using CUSUM-like approach."""
    n = len(values)
    if n < 20:
        return {"detected": False, "points": []}

    # Split into segments and test for mean shift
    segment_size = max(10, n // 10)
    change_points = []

    for i in range(segment_size, n - segment_size, segment_size // 2):
        left = values[max(0, i - segment_size):i]
        right = values[i:min(n, i + segment_size)]

        try:
            stat, p_val = sp_stats.mannwhitneyu(left, right, alternative="two-sided")
            if p_val < 0.01:
                change_points.append({
                    "index": int(i),
                    "date": str(index[i]) if hasattr(index, '__getitem__') else str(i),
                    "p_value": round(float(p_val), 6),
                    "left_mean": round(float(np.mean(left)), 4),
                    "right_mean": round(float(np.mean(right)), 4),
                    "shift_pct": round(float((np.mean(right) - np.mean(left)) / max(abs(np.mean(left)), 1e-10) * 100), 2),
                })
        except Exception:
            continue

    # Deduplicate nearby change points (keep most significant)
    filtered = []
    for cp in sorted(change_points, key=lambda x: x["p_value"]):
        if not any(abs(cp["index"] - prev["index"]) < segment_size for prev in filtered):
            filtered.append(cp)

    return {
        "detected": len(filtered) > 0,
        "count": len(filtered),
        "points": filtered[:5],
    }


def _simple_forecast(
    series: pd.Series,
    horizon: int,
    seasonal_period: int,
) -> Dict[str, Any]:
    """Generate a simple forecast using exponential smoothing."""
    try:
        from statsmodels.tsa.holtwinters import ExponentialSmoothing

        # Skip fitting if series is degenerate (would cause optimizer to hang)
        if series.std() < 1e-6 or series.dropna().nunique() < 3:
            return {"status": "skipped", "reason": "Degenerate series (constant or near-constant)"}

        values = series.values.astype(float)
        n = len(values)

        # Choose model complexity based on data size
        use_seasonal = n >= seasonal_period * 2
        trend_type = "add" if n >= 20 else None

        model = ExponentialSmoothing(
            values,
            trend=trend_type,
            seasonal="add" if use_seasonal else None,
            seasonal_periods=seasonal_period if use_seasonal else None,
        ).fit(optimized=False)

        forecast = model.forecast(horizon)
        fitted = model.fittedvalues

        # Compute residual-based prediction intervals
        residuals = values - fitted
        residual_std = float(np.std(residuals))

        forecast_values = []
        for i, val in enumerate(forecast):
            # Widen intervals with horizon
            width = residual_std * 1.96 * np.sqrt(1 + i / horizon)
            forecast_values.append({
                "step": i + 1,
                "value": round(float(val), 4),
                "lower": round(float(val - width), 4),
                "upper": round(float(val + width), 4),
            })

        # Fit quality
        mape = float(np.mean(np.abs(residuals / np.maximum(np.abs(values), 1e-10))) * 100)

        return {
            "method": "exponential_smoothing",
            "horizon": horizon,
            "trend": trend_type,
            "seasonal": "add" if use_seasonal else None,
            "mape": round(mape, 2),
            "residual_std": round(residual_std, 4),
            "forecast": forecast_values,
        }
    except Exception as e:
        return {"error": str(e), "method": "failed"}


def _generate_insights(results: Dict[str, Any]) -> List[str]:
    """Generate human-readable insights from the analysis."""
    insights = []

    freq = results.get("frequency", {}).get("inferred_freq", "unknown")
    n_obs = results.get("date_range", {}).get("n_observations", 0)
    insights.append(f"Time series contains {n_obs} observations at {freq} frequency.")

    for col, analysis in results.get("analyses", {}).items():
        # Trend insight
        trend = analysis.get("trend", {})
        direction = trend.get("direction", "")
        if direction == "increasing":
            pct = trend.get("total_pct_change", 0)
            insights.append(f"{col} shows an increasing trend ({pct:+.1f}% total change).")
        elif direction == "decreasing":
            pct = trend.get("total_pct_change", 0)
            insights.append(f"{col} shows a decreasing trend ({pct:+.1f}% total change).")

        # Stationarity insight
        stationarity = analysis.get("stationarity", {})
        if stationarity.get("is_stationary") is False:
            insights.append(f"{col} is non-stationary (ADF p={stationarity.get('p_value', 'N/A')}), indicating persistent trends or structural shifts.")

        # Seasonality insight
        seasonality = analysis.get("seasonality", {})
        if seasonality.get("has_seasonality"):
            strength = seasonality.get("seasonal_strength", 0)
            period = seasonality.get("period", 0)
            insights.append(f"{col} exhibits seasonal patterns (period={period}, strength={strength:.0%}).")

        # Volatility insight
        volatility = analysis.get("volatility", {})
        vol_trend = volatility.get("volatility_trend", "")
        if vol_trend == "increasing":
            insights.append(f"{col} shows increasing volatility, suggesting growing uncertainty.")

        # Change points
        change = analysis.get("change_points", {})
        if change.get("detected"):
            count = change.get("count", 0)
            insights.append(f"{col} has {count} detected structural change point{'s' if count > 1 else ''}.")

        # Forecast accuracy
        forecast = analysis.get("forecast", {})
        if forecast.get("mape"):
            mape = forecast["mape"]
            quality = "good" if mape < 10 else "moderate" if mape < 25 else "limited"
            insights.append(f"Forecast for {col} has {quality} accuracy (MAPE={mape:.1f}%).")

    return insights
