"""Time Series Analyzer Agent - Detects and analyzes temporal patterns in data."""
import sys
from pathlib import Path

import pandas as pd

from core.env import ensure_windows_cpu_env

ensure_windows_cpu_env()

sys.path.append(str(Path(__file__).parent.parent))

from utils.logging import log_launch, log_ok, log_warn
from core.state_manager import StateManager
from core.schema import SchemaMap, ensure_schema_map
from core.data_loader import smart_load_dataset
from ace_v4.performance.config import PerformanceConfig
from anti_gravity.core.time_series import (
    compute_time_series_analysis,
    detect_datetime_column,
    TimeSeriesConfig,
)
from core.analytics_validation import apply_artifact_validation
from core.scope_enforcer import ScopeEnforcer, ScopeViolationError


class TimeSeriesAgent:
    """Detect and analyze temporal patterns in the dataset."""

    def __init__(self, schema_map: SchemaMap, state: StateManager):
        self.schema_map = ensure_schema_map(schema_map)
        self.state = state

    def _load_dataset(self) -> pd.DataFrame:
        config = PerformanceConfig()
        dataset_info = self.state.read("active_dataset") or {}
        candidate = dataset_info.get("path")
        if candidate and Path(candidate).exists():
            return smart_load_dataset(candidate, config=config)

        default_path = self.state.get_file_path("cleaned_uploaded.csv")
        if default_path and Path(default_path).exists():
            return smart_load_dataset(default_path, config=config)
        raise FileNotFoundError(f"Active dataset not found (path={default_path})")

    def run(self):
        log_launch("Analyzing time series patterns...")

        df = self._load_dataset()
        try:
            scope_guard = ScopeEnforcer(self.state, agent="time_series")
            df = scope_guard.trim_dataframe(df)
        except ScopeViolationError as exc:
            log_warn(f"Scope lock blocked Time Series: {exc}")
            raise

        run_config = self.state.read("run_config") or {}
        fast_mode = bool(run_config.get("fast_mode", False))

        # Check if data has a datetime column
        datetime_col = detect_datetime_column(df)
        if datetime_col is None:
            log_warn("No datetime column found - skipping time series analysis")
            self.state.write("time_series_analysis", {
                "status": "skipped",
                "reason": "No datetime column detected in the dataset.",
                "valid": True,
            })
            return

        # Configure
        ts_config = TimeSeriesConfig(
            max_lags=20 if fast_mode else 40,
            forecast_horizon=6 if fast_mode else 12,
        )

        # Run analysis
        results = compute_time_series_analysis(
            df,
            config=ts_config,
            datetime_col=datetime_col,
        )

        if results.get("status") != "ok":
            reason = results.get("reason", "Time series analysis skipped")
            log_warn(f"Time series skipped: {reason}")
            self.state.write("time_series_analysis", {
                "status": "skipped",
                "reason": reason,
                "valid": True,
            })
            return

        # Mark as valid for artifact guard
        results["valid"] = True
        results["available"] = True

        # Validate and write
        validated = apply_artifact_validation("time_series_analysis", results)
        if validated:
            results = validated

        self.state.write("time_series_analysis", results)

        # Log notable insights as warnings
        for insight in results.get("insights", []):
            if any(kw in insight.lower() for kw in ("increasing volatility", "change point", "non-stationary")):
                log_warn(f"[TIME_SERIES] Notable pattern: {insight}")

        n_analyzed = len(results.get("analyses", {}))
        log_ok(f"Time series analysis complete: {n_analyzed} series analyzed, {len(results.get('insights', []))} insights")


def main():
    if len(sys.argv) < 2:
        print("Usage: python time_series_analyzer.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)
    schema_data = state.read("schema_map")
    schema_map = ensure_schema_map(schema_data)

    agent = TimeSeriesAgent(schema_map=schema_map, state=state)
    try:
        agent.run()
    except Exception as exc:
        import traceback
        print(f"[ERROR] Time series agent failed: {exc}", flush=True)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
