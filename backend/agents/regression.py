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
from anti_gravity.core.regression import compute_regression_insights, infer_target_from_question, select_classification_target
from core.analytics_validation import apply_artifact_validation


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

    def _compute_shap(self, pipeline, X_train, feature_names, target_column):
        """Compute SHAP explanations for the trained model (non-blocking)."""
        try:
            from sklearn.pipeline import Pipeline as SklearnPipeline
            from core.shap_explainer import add_shap_to_regression_output

            model = pipeline.named_steps.get("model")
            if model is None:
                return

            # Transform X_train through preprocessing steps (imputer, scaler)
            if len(pipeline.steps) > 1:
                preprocessor = SklearnPipeline(pipeline.steps[:-1])
                X_transformed = pd.DataFrame(
                    preprocessor.transform(X_train),
                    columns=feature_names,
                )
            else:
                X_transformed = X_train

            result = add_shap_to_regression_output(
                {}, model, X_transformed, target_column
            )

            if result.get("shap_available"):
                shap_data = result.get("shap_explanations", {})
                shap_artifact = {
                    "importance_ranking": shap_data.get("importance_ranking", []),
                    "base_value": shap_data.get("base_value"),
                    "explained_samples": shap_data.get("explained_samples", 0),
                    "feature_names": shap_data.get("feature_names", []),
                    "narrative": result.get("shap_narrative", ""),
                    "available": True,
                }
                self.state.write("shap_explanations", shap_artifact)
                log_ok("SHAP explanations computed")
            else:
                self.state.write("shap_explanations", {
                    "available": False,
                    "error": result.get("shap_error", "unknown"),
                })
                log_warn(f"SHAP unavailable: {result.get('shap_error', 'unknown')}")
        except Exception as e:
            log_warn(f"SHAP computation failed (non-fatal): {e}")
            self.state.write("shap_explanations", {"available": False, "error": str(e)})

    def _export_onnx(self, pipeline, feature_names, target_column):
        """Export trained model to ONNX format (non-blocking)."""
        try:
            from core.model_exporter import export_model_bundle

            artifacts_dir = Path(self.state.run_path) / "artifacts" / "models"

            result = export_model_bundle(
                model=pipeline,
                feature_names=feature_names,
                model_name=f"ace_{target_column}",
                output_dir=str(artifacts_dir),
            )

            if result.get("success"):
                onnx_meta = {
                    "available": True,
                    "onnx_path": result.get("onnx_path"),
                    "model_type": result.get("model_type"),
                    "file_size_bytes": result.get("file_size_bytes"),
                    "metadata": result.get("metadata", {}),
                    "validation": result.get("validation", {}),
                }
                self.state.write("onnx_export", onnx_meta)
                log_ok(f"ONNX model exported ({result.get('file_size_bytes', 0)} bytes)")
            else:
                self.state.write("onnx_export", {
                    "available": False,
                    "error": result.get("error", "unknown"),
                })
                log_warn(f"ONNX export failed: {result.get('error')}")
        except Exception as e:
            log_warn(f"ONNX export failed (non-fatal): {e}")
            self.state.write("onnx_export", {"available": False, "error": str(e)})

    def _detect_drift(self, X_train, X_test, feature_names):
        """Detect distribution drift between train and test splits (non-blocking)."""
        try:
            from core.drift_detector import detect_drift_adversarial

            train_df = pd.DataFrame(X_train.values, columns=feature_names) if hasattr(X_train, 'values') else pd.DataFrame(X_train, columns=feature_names)
            test_df = pd.DataFrame(X_test.values, columns=feature_names) if hasattr(X_test, 'values') else pd.DataFrame(X_test, columns=feature_names)

            result = detect_drift_adversarial(train_df, test_df, feature_names)

            drift_report = {
                "available": True,
                "has_significant_drift": result.has_significant_drift,
                "drift_score": result.drift_score,
                "drifted_features": result.drifted_features[:5],
                "stable_features": result.stable_features[:5],
                "summary": result.summary,
                "details": result.details,
            }
            self.state.write("drift_report", drift_report)
            if result.has_significant_drift:
                log_warn(f"Drift detected (score={result.drift_score:.0%})")
                self.state.add_warning(
                    "DATA_DRIFT",
                    result.summary,
                    details={"drift_score": result.drift_score},
                )
            else:
                log_ok(f"No significant drift (score={result.drift_score:.0%})")
        except Exception as e:
            log_warn(f"Drift detection failed (non-fatal): {e}")
            self.state.write("drift_report", {"available": False, "error": str(e)})

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

        # Infer target from task_intent if not explicitly set
        preferred_target = run_config.get("target_column")
        if not preferred_target:
            task_intent = run_config.get("task_intent") or {}
            question = task_intent.get("primary_question", "")
            output_type = task_intent.get("required_output_type", "")

            # Try to infer target from question
            inferred = infer_target_from_question(question, list(df.columns))
            if inferred:
                preferred_target = inferred

            # For predictive tasks, also try classification target if no match yet
            if not preferred_target and output_type == "predictive":
                classification_target = select_classification_target(df, self.schema_map)
                if classification_target:
                    preferred_target = classification_target

        insights = compute_regression_insights(
            df,
            self.schema_map,
            preferred_target=preferred_target,
            feature_whitelist=run_config.get("feature_whitelist"),
            model_type=run_config.get("model_type"),
            include_categoricals=bool(run_config.get("include_categoricals", False)),
            fast_mode=bool(run_config.get("fast_mode", False)),
        )
        if insights.get("status") != "ok":
            reason = insights.get("reason", "regression skipped")
            log_warn(f"Regression agent skipped: {reason}")
            self.state.write("regression_status", "skipped")
            self.state.write("regression_skip_reason", reason)
            return

        # Extract internal model objects before validation (not JSON-serializable)
        trained_pipeline = insights.pop("_pipeline", None)
        X_train_data = insights.pop("_X_train", None)
        X_test_data = insights.pop("_X_test", None)
        model_feature_names = insights.pop("_feature_names", None)

        if run_config:
            insights.setdefault("applied_config", run_config)
        
        insights["status"] = "success"
        validated = apply_artifact_validation("regression_insights", insights)
        if not validated:
            log_warn("Regression validation failed: metrics out of bounds.")
            raise RuntimeError("Regression metrics failed validation")

        insights = validated

        artifact_payloads = {
            "feature_governance_report": insights.get("feature_governance_report"),
            "baseline_metrics": insights.get("baseline_metrics"),
            "model_fit_report": insights.get("model_fit_report"),
            "collinearity_report": insights.get("collinearity_report"),
            "leakage_report": insights.get("leakage_report"),
            "importance_report": insights.get("importance_report"),
            "regression_coefficients_report": insights.get("regression_coefficients_report"),
        }
        for key in artifact_payloads:
            insights.pop(key, None)
        insights["artifact_refs"] = [key for key, payload in artifact_payloads.items() if payload is not None]

        for warning in insights.get("warnings", []):
            warning_type = warning.get("type")
            if warning_type:
                self.state.add_warning(
                    warning_type,
                    warning.get("note") or f"{warning_type}: {warning.get('metric')}",
                    details=warning,
                )

        self.state.write("regression_insights_pending", insights)
        for name, payload in artifact_payloads.items():
            if payload is None:
                if name != "regression_coefficients_report":
                    raise RuntimeError(f"Missing required artifact: {name}")
                continue
            payload = dict(payload)
            payload.setdefault("status", "success")
            validated_payload = apply_artifact_validation(name, payload)
            if not validated_payload:
                raise RuntimeError(f"Validation failed for artifact: {name}")
            for warning in validated_payload.get("warnings", []):
                warning_type = warning.get("type")
                if warning_type:
                    self.state.add_warning(
                        warning_type,
                        warning.get("note") or f"{warning_type}: {warning.get('metric')}",
                        details=warning,
                    )
            self.state.write(f"{name}_pending", validated_payload)

        # SHAP, ONNX export, and drift detection (non-blocking)
        target_col = insights.get("target_column", "target")
        if trained_pipeline is not None and X_train_data is not None and model_feature_names:
            self._compute_shap(trained_pipeline, X_train_data, model_feature_names, target_col)
            self._export_onnx(trained_pipeline, model_feature_names, target_col)
            if X_test_data is not None:
                self._detect_drift(X_train_data, X_test_data, model_feature_names)

        if insights.get("status") == "success":
            target = insights.get('target_column') or 'target'
            r2_score = insights.get('metrics', {}).get('r2')
            r2_display = f"{r2_score:.2f}" if isinstance(r2_score, (int, float)) else "n/a"
            log_ok(f"Regression agent modeled {target} (R^2={r2_display})")
        else:
            log_warn(f"Regression agent skipped: {insights.get('reason', 'unknown reason')}")

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
        sys.exit(1)


if __name__ == "__main__":
    main()
