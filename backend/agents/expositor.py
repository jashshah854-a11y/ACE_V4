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
        personas_data = self.state.read("personas") or {}
        strategies_data = self.state.read("strategies") or {}

        personas = personas_data.get("personas", [])
        strategies = strategies_data.get("strategies", [])

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
            enhanced_analytics = {}

        lines = []
        lines.append("# ACE Customer Intelligence Report")
        lines.append("")
        
        # Metadata
        import datetime
        run_id = Path(self.state.run_path).name
        date_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        quality_score = overseer.get("stats", {}).get("data_quality", "N/A")

        lines.append("## Run Metadata")
        lines.append(f"- **Run ID:** `{run_id}`")
        lines.append(f"- **Generated:** {date_str}")
        lines.append(f"- **Dataset Quality Score:** {quality_score}")
        lines.append("")

        # Fallback Warning
        if self._check_fallback(overseer, personas, strategies):
            lines.append("> [!WARNING]")
            lines.append("> **Fallback Mode Active**")
            lines.append("> Some parts of the engine ran in fallback mode due to missing schema or insufficient feature depth.")
            lines.append("> ACE automatically switched to backup intelligence.")
            lines.append("")

        # Domain Context
        domain = self.schema_map.domain_guess.domain if self.schema_map.domain_guess else "General"
        lines.append(f"**Domain Context:** {domain}")
        lines.append("")

        lines.append("## Executive Summary")
        lines.append(self._summary(overseer, personas, sentry, regression))
        lines.append("")

        # Enhanced Analytics Sections
        if enhanced_analytics:
            # Data Quality & Overview
            if enhanced_analytics.get("quality_metrics", {}).get("available"):
                lines.extend(self._quality_metrics_section(enhanced_analytics["quality_metrics"]))

            # Statistical Analysis
            if enhanced_analytics.get("correlation_analysis", {}).get("available"):
                lines.extend(self._correlation_section(enhanced_analytics["correlation_analysis"]))

            if enhanced_analytics.get("distribution_analysis", {}).get("available"):
                lines.extend(self._distribution_section(enhanced_analytics["distribution_analysis"]))

        if overseer:
            lines.extend(self._clusters_section(overseer))

        if regression:
            lines.extend(self._regression_section(regression))

        # Business Intelligence
        if enhanced_analytics and enhanced_analytics.get("business_intelligence", {}).get("available"):
            lines.extend(self._business_intelligence_section(enhanced_analytics["business_intelligence"]))

        # Feature Importance
        if enhanced_analytics and enhanced_analytics.get("feature_importance", {}).get("available"):
            lines.extend(self._feature_importance_section(enhanced_analytics["feature_importance"]))

        if personas:
            lines.extend(self._personas_section(personas, strategies))

        if sentry:
            lines.extend(self._anomalies_section(sentry))

        report = "\n".join(lines)
        
        # Save Report
        report_path = self.state.get_file_path("final_report.md")
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(report)
            
        self.state.write("final_report", report)
        log_ok(f"Expositor V3 Complete. Report saved to {report_path}")
        return "expositor done"

    def _check_fallback(self, overseer, personas, strategies):
        # specific checks for fallback indicators
        if overseer.get("stats", {}).get("k") == 1 and overseer.get("stats", {}).get("silhouette") == 0.0:
            return True
        # Check if personas have fallback reasoning
        for p in personas:
            if "Fallback" in p.get("reasoning", ""):
                return True
        return False

    def _summary(self, overseer, personas, sentry, regression):
        cluster_info = ""
        if overseer and "stats" in overseer:
            k = overseer["stats"].get("k", 0)
            cluster_info = f"The engine identified {k} behavioral segments. "
        
        persona_info = ""
        if personas:
            persona_info = f"{len(personas)} personas were generated from these clusters. "
        
        anomaly_info = ""
        if sentry and sentry.get("anomaly_count", 0) > 0:
            anomaly_info = f"Sentry flagged {sentry['anomaly_count']} anomalous records for further review."

        regression_info = ""
        if regression and regression.get("status") == "ok":
            metrics = regression.get("metrics", {})
            r2 = metrics.get("r2")
            target = regression.get("target_column", "the outcome")
            if r2 is not None:
                regression_info = f"Regression modeling captured `{target}` with R^2 {r2:.2f}. "
            else:
                regression_info = f"Regression modeling produced insights for `{target}`. "

        summary = cluster_info + persona_info + anomaly_info + regression_info
        return summary or "The engine completed with limited data but produced a basic structural view."

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

    def _regression_section(self, regression):
        lines = []
        lines.append("## Outcome Modeling")
        status = regression.get("status")
        if status != "ok":
            reason = regression.get("reason", "Regression modeling was skipped.")
            lines.append(f"Regression modeling skipped: {reason}.")
            lines.append("")
            return lines

        target = regression.get("target_column", "value metric")
        metrics = regression.get("metrics", {})
        detail_bits = []
        r2 = metrics.get("r2")
        if r2 is not None:
            detail_bits.append(f"R² {r2:.2f}")
        rmse = metrics.get("rmse")
        if rmse is not None:
            detail_bits.append(f"RMSE {rmse:.2f}")
        mae = metrics.get("mae")
        if mae is not None:
            detail_bits.append(f"MAE {mae:.2f}")

        summary = f"- **Target:** `{target}`"
        if detail_bits:
            summary += " (" + ", ".join(detail_bits) + ")"
        lines.append(summary)

        if regression.get("narrative"):
            lines.append(f"- **Insight:** {regression['narrative']}")

        drivers = regression.get("drivers") or []
        if drivers:
            lines.append("")
            lines.append("Top predictive drivers:")
            for driver in drivers[:5]:
                feat = driver.get("feature", "feature")
                imp = driver.get("importance")
                if imp is not None:
                    lines.append(f"- {feat}: importance {imp:.2f}")
                else:
                    lines.append(f"- {feat}")

        lines.append("")
        return lines

    def _personas_section(self, personas, strategies):
        lines = []
        lines.append("## Generated Personas & Strategies")
        
        # Map strategies to personas
        strat_map = {s.get("persona_id"): s for s in strategies}
        
        for p in personas:
            name = p.get("name", "Unknown")
            label = p.get("label", "")
            size = p.get("persona_size") or p.get("size", 0)
            pid = p.get("cluster_id")
            
            lines.append(f"### {name} ({label})")
            lines.append(f"- **Size:** {size}")
            if "summary" in p:
                lines.append(f"- **Summary:** {p['summary']}")
            if "motivation" in p:
                lines.append(f"- **Motivation:** {p['motivation']}")
            
            # Strategy Alignment
            strat = strat_map.get(pid)
            if strat:
                lines.append("")
                lines.append(f"**Strategic Approach:** {strat.get('headline', 'N/A')}")
                for tactic in strat.get("tactics", []):
                    lines.append(f"- {tactic}")
            
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

        target = fi.get("target", "outcome")
        task_type = fi.get("task_type", "regression")
        cv_score = fi.get("cv_score_mean", 0)

        lines.append(f"**Target Variable:** `{target}` ({task_type})")
        lines.append(f"**Model Performance (CV Score):** {cv_score:.3f}")
        lines.append("")

        feature_importance = fi.get("feature_importance", [])
        if feature_importance:
            lines.append("### Top Predictive Features")
            lines.append("")
            lines.append("| Rank | Feature | Importance |")
            lines.append("| :--- | :--- | :--- |")

            for feat in feature_importance[:10]:
                rank = feat.get("rank", 0)
                feature = feat.get("feature", "")
                importance = feat.get("importance", 0)
                lines.append(f"| {rank} | {feature} | {importance:.3f} |")

            lines.append("")

        insights = fi.get("insights", [])
        if insights:
            lines.append("**Predictive Insights:**")
            for insight in insights:
                lines.append(f"- {insight}")
            lines.append("")

        return lines

    def fallback(self, error):
        log_warn(f"Expositor fallback triggered: {error}")
        return f"Report generation failed: {error}"

def main():
    if len(sys.argv) < 2:
        print("Usage: python expositor.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)
    
    # Load Schema
    schema_data = state.read("schema_map")
    fallback_kwargs = {"semantic_roles": {}, "domain_guess": {"domain": "unknown", "confidence": 0.0}}
    if not schema_data:
        schema_map = SchemaMap(**fallback_kwargs)
    else:
        if isinstance(schema_data, dict):
             try:
                schema_map = SchemaMap(**schema_data)
             except Exception:
                schema_map = SchemaMap(**fallback_kwargs)
        else:
             schema_map = schema_data

    agent = Expositor(schema_map=schema_map, state=state)
    try:
        agent.run()
    except Exception as e:
        print(f"[ERROR] Expositor agent failed: {e}")
        fallback_output = agent.fallback(e)
        # Write a minimal fallback report
        report_path = state.get_file_path("final_report.md")
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(f"# ACE V3 Final Report (Fallback)\n\nGeneration failed: {e}")
        state.write("final_report", fallback_output)
        sys.exit(1)

if __name__ == "__main__":
    main()

