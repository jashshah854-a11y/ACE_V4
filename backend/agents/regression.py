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
from core.data_loader import smart_load_dataset
from ace_v4.performance.config import PerformanceConfig
from anti_gravity.core.regression import compute_regression_insights


from core.scope_enforcer import ScopeEnforcer, ScopeViolationError
class RegressionAgent:
    """Train a lightweight regression model to explain value-oriented targets."""

    def __init__(self, schema_map: SchemaMap, state: StateManager):
        self.schema_map = ensure_schema_map(schema_map)
        self.state = state

    def _load_dataset(self) -> pd.DataFrame:
        config = PerformanceConfig()
        run_config = self.state.read("run_config") or {}
        ingestion_meta = self.state.read("ingestion_meta") or {}
        fast_mode = bool(run_config.get("fast_mode", ingestion_meta.get("fast_mode", False)))
        dataset_info = self.state.read("active_dataset") or {}
        candidate = dataset_info.get("path")
        if candidate and Path(candidate).exists():
            return smart_load_dataset(candidate, config=config, fast_mode=fast_mode, prefer_parquet=True)

        default_path = self.state.get_file_path("cleaned_uploaded.csv")
        if Path(default_path).exists():
            return smart_load_dataset(default_path, config=config, fast_mode=fast_mode, prefer_parquet=True)
        raise FileNotFoundError("Active dataset not found for regression agent")

    def run(self):
        log_launch("Training regression explainer...")
        df = self._load_dataset()
        try:
            scope_guard = ScopeEnforcer(self.state, agent="regression")
            df = scope_guard.trim_dataframe(df)
        except ScopeViolationError as exc:
            log_warn(f"Scope lock blocked Regression: {exc}")
            raise
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
        
        # Analyst Core: Confidence Scoring
        r2 = insights.get("metrics", {}).get("r2")
        if r2 is not None:
            insights["confidence_score"] = max(0.1, min(1.0, float(r2)))
            insights["confidence_reasoning"] = f"Regression model fit (R2={r2:.2f})."
        else:
             insights["confidence_score"] = 0.5
             insights["confidence_reasoning"] = "No R2 score available for regression."
             
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
        print(f"[ERROR] Regression agent failed: {exc}")
        agent.fallback(exc)
        sys.exit(1)


if __name__ == "__main__":
    main()
