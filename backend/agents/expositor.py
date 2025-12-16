# agents/expositor.py
import sys
import json
from pathlib import Path
from utils.logging import log_launch, log_ok, log_warn, log_info

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from core.schema import SchemaMap

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

        lines = []
        lines.append("# ACE Customer Intelligence Report")
        lines.append("")
        
        # Metadata
        import datetime
        run_id = Path(self.state.run_path).name
        date_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        quality_score = overseer.get("stats", {}).get("data_quality", "N/A")
        
        lines.append("### Run Metadata")
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

        if overseer:
            lines.extend(self._clusters_section(overseer))
        
        if regression:
            lines.extend(self._regression_section(regression))
        
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

