# agents/expositor.py
import sys
import json
import pandas as pd
import numpy as np
from pathlib import Path
from utils.logging import log_launch, log_ok, log_warn, log_info

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from core.schema import SchemaMap
from core.enhanced_analytics import run_enhanced_analytics
from core.data_loader import smart_load_dataset
from ace_v4.performance.config import PerformanceConfig
from core.analytics_validation import apply_artifact_validation
from core.narrative_engine import NarrativeEngine, create_narrative_engine
from core.charts import ChartGenerator

class Expositor:
    def __init__(self, schema_map: SchemaMap, state: StateManager):
        self.schema_map = schema_map
        self.state = state
        self.name = "Expositor"

    def run(self):
        log_launch(f"Triggering ACE {self.name}...")

        # Read all available state
        scan = self.state.read("schema_scan_output") or {}
        overseer = self.state.read("overseer_output") or {}
        sentry = self.state.read("anomalies") or {}
        regression = self.state.read("regression_insights") or {}
        model_fit = self.state.read("model_fit_report") or {}
        importance_report = self.state.read("importance_report") or {}
        collinearity_report = self.state.read("collinearity_report") or {}
        leakage_report = self.state.read("leakage_report") or {}
        personas_data = self.state.read("personas") or {}
        strategies_data = self.state.read("strategies") or {}
        data_type = self.state.read("data_type") or {}
        validation = self.state.read("validation_report") or {}
        blocked_agents = set(validation.get("blocked_agents") or [])
        validation_notes = validation.get("notes") or []
        regression_status = self.state.read("regression_status") or "not_started"
        shap_data = self.state.read("shap_explanations") or {}
        drift_report = self.state.read("drift_report") or {}
        onnx_export = self.state.read("onnx_export") or {}

        personas = personas_data.get("personas", [])
        strategies = strategies_data.get("strategies", [])

        def _artifact_ready(artifact: dict | None) -> bool:
            return bool(
                isinstance(artifact, dict)
                and artifact.get("valid") is True
                and artifact.get("status") == "success"
            )

        # Run Enhanced Analytics
        enhanced_analytics = {}
        try:
            log_info("Running enhanced analytics...")
            active_dataset = self.state.read("active_dataset") or {}
            dataset_path = active_dataset.get("path")

            if dataset_path and Path(dataset_path).exists():
                config = PerformanceConfig()
                df = smart_load_dataset(dataset_path, config=config)

                # Get cluster labels if available
                cluster_labels = None
                if overseer and "labels" in overseer:
                    cluster_labels = np.array(overseer["labels"])

                # Convert schema_map to dict if it's a Pydantic model
                schema_dict = self.schema_map.model_dump() if hasattr(self.schema_map, "model_dump") else None

                enhanced_analytics = run_enhanced_analytics(df, schema_dict, cluster_labels)
                self.state.write("enhanced_analytics", enhanced_analytics)
                log_ok("Enhanced analytics completed")
            else:
                log_warn("Dataset not found, skipping enhanced analytics")
        except Exception as e:
            log_warn(f"Enhanced analytics failed: {e}")
            # FIX: Write empty analytics with error info rather than silently failing
            enhanced_analytics = {
                "valid": True,
                "status": "success",
                "validation_status": "error",
                "error": str(e),
            }

        lines = []
        lines.append("# ACE Customer Intelligence Report")
        lines.append("")
        
        # Metadata
        import datetime
        run_id = Path(self.state.run_path).name
        date_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        analysis_intent = self.state.read("analysis_intent") or {}
        analysis_intent_value = analysis_intent.get("intent") or "exploratory"
        target_candidate = analysis_intent.get("target_candidate") or {
            "column": None,
            "reason": "no_usable_target_found",
            "confidence": 0.0,
            "detected": False,
        }
        
        scan_output = self.state.read("schema_scan_output") or {}
        quality_score = scan_output.get("quality_score")
        if quality_score is None:
            identity_card = self.state.read("dataset_identity_card") or {}
            quality_score = identity_card.get("quality_score", 0.05)
            log_warn("Quality score missing from schema_scan_output; using fallback.")
        
        # CRITICAL: Ensure JSON-safe numeric value (fix for "No number after minus sign" error)
        try:
            quality_score = float(quality_score)
            if quality_score != quality_score or quality_score < 0:  # NaN check
                raise ValueError("Quality score is NaN or negative")
        except (ValueError, TypeError):
            raise ValueError(f"Invalid quality score format: {quality_score}")
        
        print(f"[EXPOSITOR DEBUG] Quality score for report: {quality_score}", flush=True)


        lines.append("## Run Metadata")
        lines.append(f"- **Run ID:** `{run_id}`")
        lines.append(f"- **Generated:** {date_str}")
        lines.append(f"- **Dataset Quality Score:** {quality_score}")
        lines.append("")

        # Data Type Identification
        lines.append("## Data Type Identification")
        lines.append(
            f"- **Primary Type:** {data_type.get('primary_type', 'unknown')} "
            f"(signal: {data_type.get('confidence_label', 'unknown')})"
        )
        if data_type.get("secondary_types"):
            lines.append(f"- **Secondary Signals:** {', '.join(data_type['secondary_types'])}")
        if data_type.get("notes"):
            for note in data_type["notes"]:
                lines.append(f"- {note}")
        lines.append("")

        # Domain Context
        domain = self.schema_map.domain_guess.domain if self.schema_map.domain_guess else "General"
        lines.append(f"**Domain Context:** {domain}")
        lines.append("")

        lines.append("## Executive Summary")
        lines.append(self._summary(overseer, personas, sentry, regression, model_fit, validation, data_type))
        lines.append("")

        # Validation / guardrails
        lines.append("## Validation & Guardrails")
        lines.append(f"- **Mode:** {validation.get('mode', 'unknown')}")
        lines.append(f"- **Confidence:** {validation.get('confidence_label', 'unknown')}")
        lines.append(f"- **Rows:** {validation.get('row_count', 'n/a')} | **Columns:** {validation.get('column_count', 'n/a')}")
        if blocked_agents:
            lines.append(f"- **Blocked Agents:** {', '.join(sorted(blocked_agents))}")
        for check_name, payload in (validation.get("checks") or {}).items():
            status = "ok" if payload.get("ok") else "issue"
            lines.append(f"- {check_name}: {status} ({payload.get('detail')})")
        for note in validation_notes:
            lines.append(f"- {note}")
        lines.append("")

        # Enhanced Analytics Sections
        if enhanced_analytics and "overseer" not in blocked_agents:
            # Data Quality & Overview
            quality_metrics = enhanced_analytics.get("quality_metrics")
            if _artifact_ready(quality_metrics):
                lines.extend(self._quality_metrics_section(quality_metrics))

            # Statistical Analysis
            correlation_analysis = enhanced_analytics.get("correlation_analysis")
            if _artifact_ready(correlation_analysis):
                if diagnostics_only and not should_emit_insights:
                    lines.append("Diagnostics-only: correlation analysis is exploratory and not decision-grade.")
                    lines.append("")
                lines.extend(self._correlation_section(correlation_analysis))

            distribution_analysis = enhanced_analytics.get("distribution_analysis")
            if _artifact_ready(distribution_analysis):
                if diagnostics_only and not should_emit_insights:
                    lines.append("Diagnostics-only: distribution signals are descriptive only.")
                    lines.append("")
                lines.extend(self._distribution_section(distribution_analysis))

        if "overseer" in blocked_agents:
            lines.append("## Behavioral Clusters")
            lines.append("Clustering skipped due to validation guard.")
            lines.append("")
        elif overseer:
            lines.extend(self._clusters_section(overseer))

        if "regression" in blocked_agents:
            lines.append("## Outcome Modeling")
            lines.append("Regression skipped due to validation guard.")
            lines.append("")
        elif regression:
            lines.extend(self._regression_section(regression))

        # Business Intelligence
        if enhanced_analytics and enhanced_analytics.get("business_intelligence", {}).get("available") and "fabricator" not in blocked_agents:
            lines.extend(self._business_intelligence_section(enhanced_analytics["business_intelligence"]))

        # Feature Importance
        if enhanced_analytics and enhanced_analytics.get("feature_importance", {}).get("available") and "regression" not in blocked_agents:
            lines.extend(self._feature_importance_section(enhanced_analytics["feature_importance"]))

        if "personas" in blocked_agents or "fabricator" in blocked_agents:
            lines.append("## Generated Personas & Strategies")
            lines.append("Persona and strategy generation skipped due to validation guard.")
            lines.append("")
        elif personas:
            lines.extend(self._personas_section(personas, strategies))

        if "sentry" in blocked_agents:
            lines.append("## Anomalies")
            lines.append("Anomaly detection skipped due to validation guard.")
            lines.append("")
        elif sentry:
            lines.extend(self._anomalies_section(sentry))

        report = "\n".join(lines)
        
        # Generate Executive Report (human-readable version)
        log_info("Generating executive report...")
        try:
            executive_report = self._generate_executive_report(
                data_type=data_type,
                validation=validation,
                enhanced_analytics=enhanced_analytics,
                overseer=overseer,
                personas=personas,
                importance_report=importance_report,
                sentry=sentry,
                row_count=row_count,
                col_count=col_count,
                confidence_score=confidence_score,
                model_fit=model_fit,
                shap_data=shap_data,
                drift_report=drift_report,
                onnx_export=onnx_export,
            )
        except Exception as e:
            import traceback
            log_warn(f"Executive report generation failed, using technical report: {e}")
            log_warn(f"Traceback: {traceback.format_exc()}")
            executive_report = report  # Fallback to technical report
        
        # Save Report
        report_path = self.state.get_file_path("final_report.pending.md")
        final_report_path = self.state.get_file_path("final_report.md")
        technical_report_path = self.state.get_file_path("technical_report.md")
        
        # LOGGING: Explicitly log the target path
        log_info(f"Saving final report to: {report_path}")
        
        # Save executive report as the main report
        try:
            with open(report_path, "w", encoding="utf-8") as f:
                f.write(executive_report)
                f.flush()
                # Force write to disk
                import os
                os.fsync(f.fileno())
        except Exception as e:
            log_warn(f"Failed to write report file: {e}")
            raise e
            
        self.state.write("final_report_pending", executive_report)
        try:
            with open(final_report_path, "w", encoding="utf-8") as f:
                f.write(executive_report)
            self.state.write("final_report", executive_report)
        except Exception as e:
            log_warn(f"Failed to write final_report.md: {e}")
        
        # Also save technical report for debugging/advanced users
        try:
            with open(technical_report_path, "w", encoding="utf-8") as f:
                f.write(report)
            self.state.write("technical_report", report)
            log_info(f"Technical report saved to: {technical_report_path}")
        except Exception as e:
            log_warn(f"Failed to write technical_report.md: {e}")
        
        # Verify file existence
        if Path(report_path).exists():
             size = Path(report_path).stat().st_size
             log_ok(f"Expositor V4 Complete. Report verified at {report_path} ({size} bytes)")
        else:
             log_warn(f"Expositor V4 Complete but report file missing at {report_path}")
             
        return "expositor done"

    def _summary(self, overseer, personas, sentry, regression, model_fit, validation=None, data_type=None):
        parts = []

        if validation:
            mode = validation.get("mode", "limitations")
            parts.append(f"Validation mode: {mode}.")

            if validation.get("blocked_agents"):
                parts.append(
                    "Certain agents were skipped due to insufficient evidence: "
                    + ", ".join(validation.get("blocked_agents"))
                )

        if data_type and data_type.get("primary_type"):
            parts.append(f"Dataset type inferred: {data_type.get('primary_type')}.")

        if overseer and "stats" in overseer and "overseer" not in validation.get("blocked_agents", []):
            k = overseer["stats"].get("k", 0)
            parts.append(f"The engine identified {k} behavioral segments.")

        if personas:
            parts.append(f"{len(personas)} personas were generated from these clusters.")

        if sentry and sentry.get("anomaly_count", 0) > 0:
            parts.append(f"Sentry flagged {sentry['anomaly_count']} anomalous records for review.")

        if regression and regression.get("status") == "success":
            metrics = model_fit.get("metrics", {}) if isinstance(model_fit, dict) else {}
            target = model_fit.get("target_column") or regression.get("target_column", "the outcome")
            if "r2" in metrics:
                parts.append(f"Outcome model evaluated on holdout (R2 {metrics.get('r2'):.2f}).")
            elif "accuracy" in metrics:
                parts.append(f"Outcome model evaluated on holdout (accuracy {metrics.get('accuracy'):.2f}).")
            else:
                parts.append(f"Outcome model produced a measured fit for `{target}`.")

        if not parts:
            return "The engine completed with limited data and is reporting limitations only."
        return " ".join(parts)

    def _clusters_section(self, overseer):
        lines = []
        lines.append("## Behavioral Clusters")
        stats = overseer.get("stats", {})
        
        # Compact Table
        lines.append("| Metric | Value |")
        lines.append("| :--- | :--- |")
        lines.append(f"| Optimal Clusters (k) | {stats.get('k', 'N/A')} |")
        lines.append(f"| Silhouette Score | {stats.get('silhouette', 'N/A')} |")
        lines.append(f"| Data Quality | {stats.get('data_quality', 'N/A')} |")
        lines.append("")
        return lines
    
    def _regression_section(self, regression, model_fit, importance_report, collinearity_report, leakage_report):
        lines = []
        lines.append("## Outcome Modeling")
        status = regression.get("status")
        if status != "success":
            reason = regression.get("reason", "Outcome modeling was skipped.")
            lines.append(f"Outcome modeling skipped: {reason}.")
            lines.append("")
            return lines

        target = (model_fit or {}).get("target_column") or regression.get("target_column", "value metric")
        metrics = (model_fit or {}).get("metrics", {})
        baseline = (model_fit or {}).get("baseline_metrics", {})
        split = (model_fit or {}).get("dataset_split", {})
        detail_bits = []

        if "r2" in metrics and metrics.get("r2") is not None:
            detail_bits.append(f"Holdout R2 {metrics.get('r2'):.2f}")
        if "accuracy" in metrics and metrics.get("accuracy") is not None:
            detail_bits.append(f"Holdout accuracy {metrics.get('accuracy'):.2f}")
        if "rmse" in metrics and baseline.get("rmse") is not None:
            detail_bits.append(f"RMSE {metrics.get('rmse'):.2f} vs baseline {baseline.get('rmse'):.2f}")
        if "mae" in metrics and baseline.get("mae") is not None:
            detail_bits.append(f"MAE {metrics.get('mae'):.2f} vs baseline {baseline.get('mae'):.2f}")
        if "accuracy" in metrics and baseline.get("accuracy") is not None:
            detail_bits.append(f"Baseline accuracy {baseline.get('accuracy'):.2f}")

        summary = f"- **Target:** `{target}`"
        if detail_bits:
            summary += " (" + ", ".join(detail_bits) + ")"
        lines.append(summary)

        if split:
            lines.append(f"- **Split:** {split.get('train_rows', 'n/a')} train / {split.get('test_rows', 'n/a')} test")

        if regression.get("narrative"):
            lines.append(f"- **Interpretation:** {regression['narrative']}")

        if collinearity_report and isinstance(collinearity_report, dict):
            max_vif = collinearity_report.get("max_vif")
            if isinstance(max_vif, (int, float)) and max_vif >= 10:
                lines.append(f"- **Collinearity:** max VIF {max_vif:.1f} (coefficients downgraded).")

        if leakage_report and isinstance(leakage_report, dict):
            target_pairs = leakage_report.get("flagged_target_pairs") or []
            if target_pairs:
                lines.append("- **Leakage risk:** Near-perfect target correlations detected; predictive claims suppressed.")

        method = (importance_report or {}).get("method") if isinstance(importance_report, dict) else None
        if method:
            lines.append(f"- **Driver method:** {method.replace('_', ' ').title()}")

        drivers = (importance_report or {}).get("features") if isinstance(importance_report, dict) else None
        if drivers:
            lines.append("")
            lines.append("Top predictive drivers:")
            for driver in drivers[:5]:
                feat = driver.get("feature", "feature")
                imp = driver.get("importance")
                ci_low = driver.get("ci_low")
                ci_high = driver.get("ci_high")
                if imp is not None:
                    if ci_low is not None and ci_high is not None:
                        lines.append(f"- {feat}: {imp:.1f} (95% CI {ci_low:.1f}-{ci_high:.1f})")
                    else:
                        lines.append(f"- {feat}: {imp:.1f}")
                else:
                    lines.append(f"- {feat}")

        lines.append("")
        return lines

    def _personas_section(self, personas, strategies):
        lines = []
        lines.append("## Generated Personas & Strategies")
        lines.append("")

        total_size = sum(p.get("persona_size") or p.get("size", 0) for p in personas)

        # Map strategies to personas
        strat_map = {s.get("persona_id"): s for s in strategies}

        for p in personas:
            name = p.get("name", "Unknown")
            label = p.get("label", "")
            size = p.get("persona_size") or p.get("size", 0)
            pid = p.get("cluster_id")
            pct = (size / total_size * 100) if total_size > 0 else 0

            lines.append(f"### {name}")
            if label:
                lines.append(f"*{label}*")
            lines.append("")
            lines.append(f"- **Size:** {size:,} ({pct:.1f}% of total)")
            if "summary" in p:
                lines.append(f"- **Profile:** {p['summary']}")
            if "behavior" in p:
                lines.append(f"- **Behavior:** {p['behavior']}")
            if "motivation" in p:
                lines.append(f"- **Key Driver:** {p['motivation']}")
            if "opportunity_zone" in p:
                lines.append(f"- **Opportunity:** {p['opportunity_zone']}")
            if "reasoning" in p:
                lines.append(f"- **Data Basis:** {p['reasoning']}")

            # Strategy Alignment
            strat = strat_map.get(pid)
            if strat:
                play_type = strat.get("play_type", "")
                headline = strat.get("headline", "")
                lines.append("")
                lines.append(f"**Strategy ({play_type}):** {headline}")
                for tactic in strat.get("tactics", []):
                    lines.append(f"  - {tactic}")

            lines.append("")
        return lines

    def _anomalies_section(self, sentry):
        lines = []
        lines.append("## Anomaly Detection")
        count = sentry.get("anomaly_count", 0)
        lines.append(f"**Total Anomalies Detected:** {count}")

        if count > 0:
            lines.append("Top anomalies have been flagged in the system for review.")
            drivers = sentry.get("drivers", {})
            if drivers:
                lines.append("")
                lines.append("**Key Anomaly Drivers:**")
                for col, score in list(drivers.items())[:5]:
                    lines.append(f"- {col}: {score:.2f}")

        lines.append("")
        return lines

    def _quality_metrics_section(self, quality):
        lines = []
        lines.append("## Data Quality Assessment")
        lines.append("")
        lines.append("| Metric | Value |")
        lines.append("| :--- | :--- |")
        lines.append(f"| Overall Completeness | {quality.get('overall_completeness', 0):.1f}% |")
        lines.append(f"| Total Records | {quality.get('total_records', 0):,} |")
        lines.append(f"| Total Features | {quality.get('total_features', 0)} |")
        lines.append(f"| Numeric Features | {quality.get('numeric_features', 0)} |")
        lines.append(f"| Categorical Features | {quality.get('categorical_features', 0)} |")
        lines.append("")

        insights = quality.get("insights", [])
        if insights:
            lines.append("**Key Insights:**")
            for insight in insights:
                lines.append(f"- {insight}")
            lines.append("")

        return lines

    def _correlation_section(self, corr):
        lines = []
        lines.append("## Statistical Correlations")
        lines.append("")

        strong_corr = corr.get("strong_correlations", [])
        if strong_corr:
            lines.append(f"Found **{corr.get('total_correlations', 0)} significant relationships** between features.")
            lines.append("")
            lines.append("### Top Feature Relationships")
            lines.append("")
            lines.append("| Feature 1 | Feature 2 | Correlation | Strength | Direction |")
            lines.append("| :--- | :--- | :--- | :--- | :--- |")

            for rel in strong_corr[:10]:
                feat1 = rel.get("feature1", "")
                feat2 = rel.get("feature2", "")
                pearson = rel.get("pearson", 0)
                strength = rel.get("strength", "").replace("_", " ").title()
                direction = rel.get("direction", "").capitalize()
                lines.append(f"| {feat1} | {feat2} | {pearson:.3f} | {strength} | {direction} |")

            lines.append("")

        insights = corr.get("insights", [])
        if insights:
            lines.append("**Insights:**")
            for insight in insights:
                lines.append(f"- {insight}")
            lines.append("")

        return lines

    def _distribution_section(self, dist):
        lines = []
        lines.append("## Distribution Analysis")
        lines.append("")

        distributions = dist.get("distributions", {})
        if not distributions:
            return lines

        lines.append(f"Analyzed **{len(distributions)} numeric features** for statistical properties.")
        lines.append("")

        # Highlight interesting distributions
        interesting = []
        for col, data in distributions.items():
            if data.get("outlier_percentage", 0) > 10:
                interesting.append(f"**{col}**: {data['outlier_percentage']:.1f}% outliers ({data['distribution_type']})")
            elif abs(data.get("skewness", 0)) > 2:
                interesting.append(f"**{col}**: Highly skewed ({data['distribution_type']})")

        if interesting:
            lines.append("**Notable Distributions:**")
            for item in interesting[:5]:
                lines.append(f"- {item}")
            lines.append("")

        insights = dist.get("insights", [])
        if insights:
            lines.append("**Statistical Insights:**")
            for insight in insights:
                lines.append(f"- {insight}")
            lines.append("")

        return lines

    def _business_intelligence_section(self, bi):
        lines = []
        lines.append("## Business Intelligence")
        lines.append("")

        # Value Metrics
        value_metrics = bi.get("value_metrics")
        if value_metrics:
            lines.append("### Value Analysis")
            lines.append("")
            lines.append("| Metric | Value |")
            lines.append("| :--- | :--- |")
            lines.append(f"| Total Value | ${value_metrics.get('total_value', 0):,.2f} |")
            lines.append(f"| Average Value | ${value_metrics.get('avg_value', 0):,.2f} |")
            lines.append(f"| Median Value | ${value_metrics.get('median_value', 0):,.2f} |")
            lines.append(f"| Top 10% Threshold | ${value_metrics.get('top_10_percent_value', 0):,.2f} |")
            lines.append(f"| Value Concentration (Gini) | {value_metrics.get('value_concentration', 0):.3f} |")
            lines.append("")

        # CLV Proxy
        clv = bi.get("clv_proxy")
        if clv:
            lines.append("### Customer Lifetime Value Proxy")
            lines.append("")
            lines.append(f"- **Average Value per Record:** ${clv.get('avg_value_per_record', 0):,.2f}")
            lines.append(f"- **High-Value Threshold:** ${clv.get('high_value_threshold', 0):,.2f}")
            lines.append(f"- **High-Value Customer Count:** {clv.get('high_value_count', 0):,}")
            lines.append("")

        # Segment Value
        segment_value = bi.get("segment_value")
        if segment_value:
            lines.append("### Segment Value Contribution")
            lines.append("")
            lines.append("| Segment | Total Value | Avg Value | Size | Contribution % |")
            lines.append("| :--- | :--- | :--- | :--- | :--- |")

            for seg in segment_value[:5]:
                lines.append(f"| {seg['segment']} | ${seg['total_value']:,.2f} | "
                           f"${seg['avg_value']:,.2f} | {seg['size']:,} | "
                           f"{seg['value_contribution_pct']:.1f}% |")

            lines.append("")

        # Churn Risk
        churn = bi.get("churn_risk")
        if churn:
            lines.append("### Churn Risk Analysis")
            lines.append("")
            risk_pct = churn.get("at_risk_percentage", 0)
            if risk_pct > 25:
                lines.append(f"> [!WARNING]")
                lines.append(f"> **{churn.get('at_risk_count', 0):,} records ({risk_pct:.1f}%) show low activity**")
                lines.append(f"> These customers may be at risk of churn.")
            else:
                lines.append(f"- **At-Risk Count:** {churn.get('at_risk_count', 0):,} ({risk_pct:.1f}%)")
                lines.append(f"- **Average Activity:** {churn.get('avg_activity', 0):.2f}")
            lines.append("")

        insights = bi.get("insights", [])
        if insights:
            lines.append("**Business Insights:**")
            for insight in insights:
                lines.append(f"- {insight}")
            lines.append("")

        return lines

    def _feature_importance_section(self, fi):
        lines = []
        lines.append("## Predictive Feature Importance")
        lines.append("")

        target = fi.get("target_column", "outcome")
        method = fi.get("method", "unknown method")
        scoring = fi.get("scoring", "")
        split = fi.get("dataset_split", {})

        lines.append(f"**Target Variable:** `{target}`")
        lines.append(f"**Method:** {method.replace('_', ' ').title()}")
        if scoring:
            lines.append(f"**Scoring:** {scoring}")
        if split:
            lines.append(f"**Holdout Split:** {split.get('train_rows', 'n/a')} train / {split.get('test_rows', 'n/a')} test")
        lines.append("")

        feature_importance = fi.get("features", [])
        if feature_importance:
            lines.append("### Top Predictive Features")
            lines.append("")
            lines.append("| Rank | Feature | Importance (0-100) | 95% CI |")
            lines.append("| :--- | :--- | :--- | :--- |")

            for rank, feat in enumerate(feature_importance[:10], start=1):
                feature = feat.get("feature", "")
                importance = feat.get("importance", 0)
                ci_low = feat.get("ci_low")
                ci_high = feat.get("ci_high")
                ci_display = "n/a"
                if ci_low is not None and ci_high is not None:
                    ci_display = f"{ci_low:.1f}-{ci_high:.1f}"
                lines.append(f"| {rank} | {feature} | {importance:.1f} | {ci_display} |")

            lines.append("")

        return lines

    def _generate_executive_report(
        self,
        data_type: dict,
        validation: dict,
        enhanced_analytics: dict,
        overseer: dict,
        personas: list,
        importance_report: dict,
        sentry: dict,
        row_count: int,
        col_count: int,
        confidence_score: float,
        model_fit: dict | None = None,
        shap_data: dict | None = None,
        drift_report: dict | None = None,
        onnx_export: dict | None = None,
    ) -> str:
        """Generate a human-readable executive report.
        
        If executive_narrator agent has already generated a narrative, use it.
        Otherwise, fall back to NarrativeEngine-based generation.
        """
        
        # Check if executive_narrator already produced a report
        executive_narrative = self.state.read("executive_narrative")
        if executive_narrative and isinstance(executive_narrative, dict):
            markdown = executive_narrative.get("markdown")
            if markdown and len(markdown) > 100:
                log_info("Using pre-generated executive narrative from executive_narrator agent")
                return markdown
        
        # Check if we have deep insights to enhance the report
        deep_insights = self.state.read("deep_insights") or {}
        has_deep_insights = deep_insights.get("insights") and len(deep_insights.get("insights", [])) > 0

        narrator = create_narrative_engine(self.state)
        lines = []

        # Initialize chart generator
        artifacts_dir = Path(self.state.run_path) / "artifacts"
        chart_gen = ChartGenerator(artifacts_dir)
        
        # Title
        domain_name = data_type.get("primary_type", "business").replace("_", " ").title()
        lines.append(f"# {domain_name} Intelligence Report")
        lines.append("")
        
        # Get correlation and driver data (needed for multiple sections)
        correlations = []
        corr_analysis = enhanced_analytics.get("correlation_analysis", {})
        if corr_analysis.get("strong_correlations"):
            correlations = corr_analysis["strong_correlations"]
        top_correlation = correlations[0] if correlations else None
        
        drivers = []
        if importance_report and importance_report.get("features"):
            drivers = importance_report["features"]
        top_driver = drivers[0] if drivers else None
        
        segment_count = overseer.get("stats", {}).get("k", 0) if overseer else 0
        anomaly_count = sentry.get("anomaly_count", 0) if sentry else 0
        
        # If we have deep insights, use them for the executive summary
        if has_deep_insights:
            lines.append("## Executive Summary")
            lines.append("")
            headline = deep_insights.get("headline_insight", {})
            if headline:
                lines.append(f"> **Key Finding:** {headline.get('finding', '')}")
                lines.append("")
            
            # Use top insights
            insights = deep_insights.get("insights", [])[:5]
            for i, insight in enumerate(insights, 1):
                lines.append(f"**{i}. {insight.get('title', 'Insight')}**")
                lines.append(f"- {insight.get('finding', '')}")
                if insight.get('recommendation'):
                    lines.append(f"- *Recommendation:* {insight.get('recommendation')}")
                lines.append("")
            
            # Use recommendations
            recs = deep_insights.get("recommendations", [])
            if recs:
                lines.append("## Recommended Actions")
                lines.append("")
                for rec in recs[:5]:
                    lines.append(f"**P{rec.get('priority', '?')}:** {rec.get('action', '')}")
                lines.append("")
        else:
            # Fall back to original NarrativeEngine logic
            lines.append("## Executive Summary")
            lines.append("")
            
            exec_summary = narrator.generate_executive_summary(
                data_type=data_type.get("primary_type", "general"),
                row_count=row_count,
                top_correlation=top_correlation,
                top_driver=top_driver,
                segment_count=segment_count,
                anomaly_count=anomaly_count,
            )
            lines.append(exec_summary)
            lines.append("")
        
        # Your Data section (concise)
        lines.append("## Your Data")
        lines.append("")
        quality_score = enhanced_analytics.get("quality_metrics", {}).get("overall_completeness", 100) / 100
        data_summary = narrator.translate_data_summary(row_count, col_count, data_type.get("primary_type", "general"), quality_score)
        lines.append(data_summary)
        lines.append("")
        
        # Key Relationships (top 3 correlations translated)
        if correlations:
            lines.append("## Key Relationships")
            lines.append("")

            # Generate correlation chart
            chart_md = chart_gen.correlations(
                correlations[:10],
                title="Feature Correlations",
            )
            if chart_md:
                lines.append(chart_md)
                lines.append("")

            for corr in correlations[:3]:
                translated = narrator.translate_correlation(
                    corr.get("feature1", ""),
                    corr.get("feature2", ""),
                    corr.get("pearson", 0),
                )
                lines.append(f"- {translated}")
            lines.append("")
        
        # Top Drivers (if available)
        if drivers:
            lines.append("## What Matters Most")
            lines.append("")

            # Generate feature importance chart
            chart_md = chart_gen.feature_importance(
                drivers[:10],
                title=f"Top Predictors of {importance_report.get('target_column', 'Outcome')}",
            )
            if chart_md:
                lines.append(chart_md)
                lines.append("")

            target = importance_report.get("target_column", "outcome")
            for i, driver in enumerate(drivers[:5], 1):
                translated = narrator.translate_driver(
                    driver.get("feature", ""),
                    driver.get("importance", 0),
                    rank=i,
                    target=target,
                )
                lines.append(translated)
            lines.append("")
        
        # Model Performance Chart and Fit Warning
        if model_fit and isinstance(model_fit, dict):
            fit_metrics = model_fit.get("metrics", {})
            baseline_metrics = model_fit.get("baseline_metrics", {})
            r2 = fit_metrics.get("r2")
            accuracy = fit_metrics.get("accuracy")
            target = model_fit.get("target_column", "outcome")

            # Generate model performance chart if we have metrics
            if fit_metrics and (accuracy is not None or r2 is not None):
                chart_md = chart_gen.model_performance(
                    fit_metrics,
                    baseline_metrics if baseline_metrics else None,
                    title=f"Model Performance: {target}",
                )
                if chart_md:
                    lines.append("## Model Performance")
                    lines.append("")
                    lines.append(chart_md)
                    lines.append("")

            if r2 is not None and isinstance(r2, (int, float)) and r2 < 0:
                lines.append("## Model Fit Warning")
                lines.append("")
                lines.append(
                    f"The predictive model for **{target}** has a negative R-squared ({r2:.2f}), "
                    "meaning it performs worse than simply predicting the average. "
                    "The feature importance rankings above show *relative* contributions "
                    "but should not be interpreted as reliable predictors. Consider:"
                )
                lines.append("- The available features may not capture the true drivers")
                lines.append("- Additional data collection or feature engineering may be needed")
                lines.append("- The relationship may be non-linear or require domain-specific modeling")
                lines.append("")
            elif accuracy is not None and isinstance(accuracy, (int, float)) and accuracy < 0.55:
                lines.append("## Model Fit Warning")
                lines.append("")
                lines.append(
                    f"The classification model for **{target}** has low accuracy ({accuracy:.0%}), "
                    "only marginally better than random. Predictions should be treated as exploratory."
                )
                lines.append("")

        # SHAP Feature Attribution (game-theoretic explanation)
        if shap_data and shap_data.get("available"):
            target_h = importance_report.get("target_column", "outcome")
            shap_narrative = narrator.translate_shap_explanation(shap_data, target_name=target_h)
            if shap_narrative:
                lines.append("## Detailed Feature Attribution (SHAP)")
                lines.append("")
                lines.append(shap_narrative)
                lines.append("")

        # Drift Detection
        if drift_report and drift_report.get("available"):
            if drift_report.get("has_significant_drift"):
                lines.append("## Data Drift Warning")
                lines.append("")
                lines.append(drift_report.get("summary", "Significant drift detected."))
                lines.append("")

        # Customer Segments (if available)
        if segment_count > 0 and personas:
            lines.append("## Customer Segments")
            lines.append("")

            # Generate segment pie chart
            segment_data = [
                {"name": p.get("name", f"Segment {i}"), "size": p.get("persona_size", p.get("size", 0))}
                for i, p in enumerate(personas[:8])
            ]
            chart_md = chart_gen.segment_pie(
                segment_data,
                title="Customer Segment Distribution",
            )
            if chart_md:
                lines.append(chart_md)
                lines.append("")

            total = sum(p.get("persona_size", p.get("size", 0)) for p in personas)
            for i, persona in enumerate(personas[:5]):
                seg = narrator.translate_segment(
                    segment_id=i,
                    size=persona.get("persona_size", persona.get("size", 0)),
                    total=total,
                    persona_name=persona.get("name"),
                    key_traits=[persona.get("summary", "")][:1] if persona.get("summary") else None,
                )
                lines.append(f"### {seg['name']}")
                lines.append(f"- **{seg['size']:,} customers** ({seg['percentage']:.1f}% of total)")
                if persona.get("summary"):
                    lines.append(f"- {persona['summary']}")
                if persona.get("motivation"):
                    lines.append(f"- **Key Driver:** {persona['motivation']}")
                if persona.get("opportunity_zone"):
                    lines.append(f"- **Opportunity:** {persona['opportunity_zone']}")
                if persona.get("action"):
                    lines.append(f"- **Recommended Action:** {persona['action']}")
                lines.append("")
        
        # Recommendations
        if correlations or drivers:
            lines.append("## Recommended Actions")
            lines.append("")
            
            # Build segment data for recommendations
            segment_data = []
            for p in personas[:3]:
                segment_data.append({
                    "name": p.get("name", "Segment"),
                    "size": p.get("persona_size", p.get("size", 0)),
                    "avg_value": 0,  # Would need value column data
                })
            
            recs = narrator.generate_recommendations(
                correlations=correlations[:3] if correlations else None,
                drivers=drivers[:3] if drivers else None,
                segments=segment_data if segment_data else None,
            )
            
            if recs:
                lines.append("| Priority | Action | Rationale |")
                lines.append("|----------|--------|-----------|")
                for rec in recs[:5]:
                    lines.append(f"| {rec['priority']} | {rec['action']} | {rec['rationale']} |")
                lines.append("")
        
        # Anomalies (if any)
        if anomaly_count > 0:
            lines.append("## Items Requiring Attention")
            lines.append("")
            # Convert drivers dict to list format if needed
            drivers_raw = sentry.get("drivers", []) if sentry else []
            if isinstance(drivers_raw, dict):
                drivers_list = [{"feature": k, "score": v} for k, v in drivers_raw.items()]
            else:
                drivers_list = drivers_raw
            anomaly_text = narrator.translate_anomaly_finding(
                count=anomaly_count,
                total=row_count,
                top_drivers=drivers_list,
            )
            lines.append(anomaly_text)
            lines.append("")
        
        # Data Confidence
        lines.append("## Data Confidence")
        lines.append("")
        confidence_text = narrator.translate_validation(
            validation.get("checks", {}),
            validation.get("mode", "unknown"),
        )
        lines.append(confidence_text)
        lines.append("")
        
        # Confidence score as percentage
        conf_pct = (confidence_score or 0.5) * 100
        if conf_pct >= 80:
            conf_label = "High"
        elif conf_pct >= 50:
            conf_label = "Moderate"
        else:
            conf_label = "Limited"
        lines.append(f"**Confidence Level:** {conf_label} ({conf_pct:.0f}%)")
        lines.append("")
        # ONNX Export Status
        if onnx_export and onnx_export.get("available"):
            model_type = onnx_export.get("model_type", "unknown")
            file_size = onnx_export.get("file_size_bytes", 0)
            size_kb = file_size / 1024 if file_size else 0
            lines.append(f"**Deployable Model**: An ONNX model ({model_type}, {size_kb:.0f} KB) has been exported and is ready for integration into production systems.")
            lines.append("")

        lines.append("*This report is generated based on statistical analysis. Recommendations are directional and should be validated with domain expertise.*")
        lines.append("")

        # Save chart metadata to state for frontend reference
        generated_charts = chart_gen.get_generated_charts()
        if generated_charts:
            self.state.write("report_charts", {
                "charts": generated_charts,
                "charts_dir": str(chart_gen.charts_dir),
                "count": len(generated_charts),
            })
            log_ok(f"Generated {len(generated_charts)} visualization charts")

        return "\n".join(lines)

def main():
    if len(sys.argv) < 2:
        print("Usage: python expositor.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)
    
    # Load Schema
    schema_data = state.read("schema_map")
    if not schema_data:
        print("[ERROR] Expositor requires schema_map but none was found.")
        sys.exit(1)

    if isinstance(schema_data, dict):
        try:
            schema_map = SchemaMap(**schema_data)
        except Exception as err:
            print(f"[ERROR] Invalid schema_map payload: {err}")
            sys.exit(1)
    else:
        schema_map = schema_data

    agent = Expositor(schema_map=schema_map, state=state)
    try:
        agent.run()
    except Exception as e:
        print(f"[ERROR] Expositor agent failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

