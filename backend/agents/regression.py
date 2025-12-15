import sys
from pathlib import Path

import pandas as pd

from core.env import ensure_windows_cpu_env

ensure_windows_cpu_env()

# Add project root
sys.path.append(str(Path(__file__).parent.parent))

from utils.logging import log_launch, log_ok, log_warn
from core.state_manager import StateManager
from core.schema import SchemaMap, ensure_schema_map
from backend.anti_gravity.core.regression import compute_regression_insights


class RegressionAgent:
    """Train a lightweight regression model to explain value-oriented targets."""

    def __init__(self, schema_map: SchemaMap, state: StateManager):
        self.schema_map = ensure_schema_map(schema_map)
        self.state = state

    def _load_dataset(self) -> pd.DataFrame:
        dataset_info = self.state.read("active_dataset") or {}
        candidate = dataset_info.get("path")
        if candidate and Path(candidate).exists():
            return pd.read_csv(candidate)

        default_path = self.state.get_file_path("cleaned_uploaded.csv")
        if Path(default_path).exists():
            return pd.read_csv(default_path)
        raise FileNotFoundError("Active dataset not found for regression agent")

    def run(self):
        log_launch("Training regression explainer...")
        df = self._load_dataset()
        run_config = self.state.read("run_config") or {}
        insights = compute_regression_insights(
            df,
            self.schema_map,
            preferred_target=run_config.get("target_column"),
            feature_whitelist=run_config.get("feature_whitelist"),
            model_type=run_config.get("model_type"),
            include_categoricals=bool(run_config.get("include_categoricals", False)),
            fast_mode=bool(run_config.get("fast_mode", False)),
        )
        if run_config:
            insights.setdefault("applied_config", run_config)
        self.state.write("regression_insights", insights)

        if insights.get("status") == "ok":
            target = insights.get('target_column') or 'target'
            r2_score = insights.get('metrics', {}).get('r2')
            r2_display = f"{r2_score:.2f}" if isinstance(r2_score, (int, float)) else "n/a"
            log_ok(f"Regression agent modeled {target} (R^2={r2_display})")
        else:
            log_warn(f"Regression agent skipped: {insights.get('reason', 'unknown reason')}")

    def fallback(self, error):
        log_warn(f"Regression agent fallback triggered: {error}")
        payload = {"status": "error", "reason": str(error)}
        self.state.write("regression_insights", payload)
        return payload


def main():
    if len(sys.argv) < 2:
        print("Usage: python regression.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)
    schema_data = state.read("schema_map")
    schema_map = ensure_schema_map(schema_data)

    agent = RegressionAgent(schema_map=schema_map, state=state)
    try:
        agent.run()
    except Exception as exc:
        agent.fallback(exc)


if __name__ == "__main__":
    main()
