"""
Executive Narrator Agent - Produces publication-ready reports using LLM.

Takes the ranked insights from DeepInsightAgent and produces
executive-quality narrative output using multi-pass LLM refinement:

- Pass 1: Draft interpretation from raw insights
- Pass 2: Refine with evidence citations and specific numbers  
- Pass 3: Polish for publication quality

This is the final step that makes ACE reports truly self-contained
and human-quality.
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from core.llm import call_gemini
from utils.logging import log_launch, log_ok, log_warn, log_info


class ExecutiveNarratorAgent:
    """Produces human-quality executive reports using 3-pass LLM synthesis."""
    
    def __init__(self, state: StateManager):
        self.state = state
        self.name = "ExecutiveNarrator"
        
    def run(self) -> Dict[str, Any]:
        """Generate the final executive report."""
        log_launch(f"Agent {self.name}")
        
        # Load all inputs from interpretation pipeline
        insights = self.state.read("deep_insights") or {}
        dot_connections = self.state.read("dot_connections") or {}
        hypotheses = self.state.read("hypotheses") or {}
        implications = self.state.read("deep_implications") or {}
        story_narrative = self.state.read("story_narrative") or {}
        
        # Load data artifacts
        profile = self.state.read("data_profile") or {}
        enhanced = self.state.read("enhanced_analytics") or {}
        anomalies = self.state.read("anomalies") or {}
        time_series = self.state.read("time_series_analysis") or {}
        trust = self.state.read("trust_object") or {}
        
        # Build data summary for context
        data_summary = self._build_data_summary(profile, enhanced, anomalies, time_series, trust)
        
        # Check if story_framer already generated a narrative
        if story_narrative.get("narrative"):
            log_info("Using narrative from story_framer...")
            narrative_obj = story_narrative["narrative"]
            
            # Use the story_framer's 3-act structure
            polished = self._build_from_story(
                narrative_obj,
                implications.get("stark_truths", []),
                implications.get("overall_stark_truth", ""),
                hypotheses.get("red_flags", [])
            )
        else:
            # Fall back to original 3-pass LLM generation
            log_info("Pass 1: Generating draft narrative...")
            draft = self._pass1_draft(insights, data_summary)
            
            log_info("Pass 2: Refining with evidence...")
            refined = self._pass2_refine(draft, insights, data_summary)
            
            log_info("Pass 3: Polish for publication...")
            polished = self._pass3_polish(refined)
        
        # Build the final executive report structure
        report = self._build_report(
            polished, insights, data_summary,
            story_narrative, implications, dot_connections
        )
        
        # Save artifacts
        self.state.write("executive_narrative", report)
        
        # Also save as markdown file
        report_path = Path(self.state.run_path) / "executive_report.md"
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(report["markdown"])
        
        log_ok(f"Executive report generated: {len(report['markdown'])} bytes")
        
        return {
            "status": "success",
            "report_path": str(report_path),
            "word_count": len(report["markdown"].split()),
            "sections": list(report.keys()),
            "used_story_framer": bool(story_narrative.get("narrative")),
        }
    
    def _build_from_story(
        self, 
        narrative: dict, 
        stark_truths: list, 
        overall_stark: str,
        red_flags: list
    ) -> str:
        """Build polished narrative from story_framer output."""
        parts = []
        
        # Headline
        if narrative.get("headline"):
            parts.append(f"**{narrative['headline']}**\n")
        
        # 3-act structure
        if narrative.get("act1_setup"):
            parts.append(narrative["act1_setup"])
            parts.append("")
        
        if narrative.get("act2_discovery"):
            parts.append(narrative["act2_discovery"])
            parts.append("")
        
        if narrative.get("act3_implications"):
            parts.append(narrative["act3_implications"])
            parts.append("")
        
        # Overall stark truth
        if overall_stark:
            parts.append(f"\n**The Bottom Line:** {overall_stark}")
        
        # Red flags callout
        if red_flags:
            parts.append("\n**Investigate Further:**")
            for rf in red_flags[:2]:
                parts.append(f"- {rf.get('hypothesis', '')[:150]}")
        
        return "\n".join(parts)
    
    def _build_data_summary(self, profile, enhanced, anomalies, time_series, trust) -> Dict[str, Any]:
        """Build a summary of the data for LLM context."""
        return {
            "row_count": profile.get("row_count", 0),
            "column_count": profile.get("column_count", 0),
            "quality_score": enhanced.get("quality_metrics", {}).get("overall_completeness", 0),
            "anomaly_count": anomalies.get("anomaly_count", 0),
            "anomaly_pct": anomalies.get("anomaly_count", 0) / max(profile.get("row_count", 1), 1) * 100,
            "top_correlations": enhanced.get("correlation_analysis", {}).get("strong_correlations", [])[:3],
            "distributions": enhanced.get("distribution_analysis", {}).get("distributions", {}),
            "time_series_trend": time_series.get("analyses", {}).get(
                list(time_series.get("analyses", {}).keys())[0] if time_series.get("analyses") else "", {}
            ).get("trend", {}),
            "confidence_score": trust.get("overall_confidence", 50),
        }
    
    def _pass1_draft(self, insights: Dict, data_summary: Dict) -> str:
        """Pass 1: Generate initial draft narrative."""
        
        domain = insights.get("domain_detected", "business")
        insight_list = insights.get("insights", [])
        recommendations = insights.get("recommendations", [])
        
        prompt = f"""You are writing an executive intelligence report for a {domain} dataset.

DATA SUMMARY:
- Records analyzed: {data_summary['row_count']:,}
- Variables: {data_summary['column_count']}
- Data quality: {data_summary['quality_score']:.1f}%
- Anomalies detected: {data_summary['anomaly_count']:,} ({data_summary['anomaly_pct']:.1f}%)
- Confidence score: {data_summary['confidence_score']}%

TOP INSIGHTS (ranked by impact):
{self._format_insights(insight_list[:5])}

RECOMMENDED ACTIONS:
{self._format_recommendations(recommendations)}

Write a 400-500 word executive summary that:
1. Opens with the SINGLE most important finding ("Your data reveals that...")
2. Explains 3-4 key patterns discovered, using specific numbers
3. Highlights any risks or opportunities identified
4. Ends with top 3 prioritized action items

STYLE GUIDELINES:
- Write for a CEO with 2 minutes to read this
- Use confident, direct language (no "might", "could", "perhaps")
- Include specific numbers from the data
- Make it actionable - what should they DO?
- No jargon - translate technical terms
"""
        return call_gemini(prompt, temperature=0.4, max_tokens=2000)
    
    def _pass2_refine(self, draft: str, insights: Dict, data_summary: Dict) -> str:
        """Pass 2: Refine with evidence citations."""
        
        prompt = f"""Review and improve this executive summary:

--- DRAFT ---
{draft}
--- END DRAFT ---

IMPROVEMENTS NEEDED:
1. Add specific data citations where claims are made
   - Instead of "many users" → "32.8% of users (21,472 records)"
   - Instead of "strong correlation" → "strong correlation (r=0.82)"
2. Make recommendations more actionable (who should do what by when)
3. Add confidence qualifiers ONLY where data quality is limited
4. Ensure every claim is backed by evidence from:
{self._format_insights(insights.get('insights', [])[:5])}

DATA CONTEXT:
- Total records: {data_summary['row_count']:,}
- Anomaly rate: {data_summary['anomaly_pct']:.1f}%
- Top correlations: {json.dumps([(c.get('feature1'), c.get('feature2'), c.get('pearson')) for c in data_summary['top_correlations']])}

Return the improved summary. Keep the same structure but enhance the evidential rigor.
"""
        return call_gemini(prompt, temperature=0.3, max_tokens=2000)
    
    def _pass3_polish(self, refined: str) -> str:
        """Pass 3: Final polish for publication quality."""
        
        prompt = f"""Final polish of this executive report for publication:

{refined}

POLISH CHECKLIST:
1. Remove any redundancy or repetition
2. Ensure each paragraph adds NEW information
3. Format numbers properly (65,521 not 65521, 32.8% not 0.328)
4. Create smooth transitions between sections
5. End with a clear, memorable closing statement
6. Check that the opening line is compelling and captures attention
7. Ensure action items are specific and prioritized

Return the polished final version. This should be publication-ready for C-suite distribution.
"""
        return call_gemini(prompt, temperature=0.2, max_tokens=2000)
    
    def _build_report(
        self, 
        narrative: str, 
        insights: Dict, 
        data_summary: Dict,
        story_narrative: Dict = None,
        implications: Dict = None,
        dot_connections: Dict = None
    ) -> Dict[str, Any]:
        """Build the complete report structure."""
        story_narrative = story_narrative or {}
        implications = implications or {}
        dot_connections = dot_connections or {}
        
        domain = insights.get("domain_detected", "Business")
        
        # Use story_framer headline if available, else fall back to insight headline
        story_data = story_narrative.get("narrative", {})
        headline_text = story_data.get("headline") if story_data else None
        if not headline_text:
            headline = insights.get("headline_insight", {})
            headline_text = headline.get("finding", "")[:200] if headline else ""
        
        # Build markdown report
        md_parts = []
        
        # Title
        md_parts.append(f"# {domain.title()} Intelligence Report")
        md_parts.append("")
        md_parts.append(f"*Generated: {datetime.now().strftime('%B %d, %Y at %H:%M')}*")
        md_parts.append("")
        
        # Headline insight box
        if headline_text:
            md_parts.append("> **Key Finding:** " + headline_text)
            md_parts.append("")
        
        # Executive summary
        md_parts.append("## Executive Summary")
        md_parts.append("")
        md_parts.append(narrative)
        md_parts.append("")
        
        # Key metrics table
        md_parts.append("## Data Overview")
        md_parts.append("")
        md_parts.append("| Metric | Value |")
        md_parts.append("|--------|-------|")
        md_parts.append(f"| Records Analyzed | {data_summary['row_count']:,} |")
        md_parts.append(f"| Variables | {data_summary['column_count']} |")
        md_parts.append(f"| Data Quality | {data_summary['quality_score']:.1f}% |")
        md_parts.append(f"| Anomalies Flagged | {data_summary['anomaly_count']:,} ({data_summary['anomaly_pct']:.1f}%) |")
        md_parts.append(f"| Confidence Score | {data_summary['confidence_score']}% |")
        md_parts.append("")
        
        # Top insights
        md_parts.append("## Key Insights")
        md_parts.append("")
        for i, insight in enumerate(insights.get("insights", [])[:5], 1):
            md_parts.append(f"### {i}. {insight.get('title', 'Insight')}")
            md_parts.append("")
            md_parts.append(f"**Finding:** {insight.get('finding', '')}")
            md_parts.append("")
            md_parts.append(f"**Why It Matters:** {insight.get('why_it_matters', '')}")
            md_parts.append("")
            if insight.get("recommendation"):
                md_parts.append(f"**Recommended Action:** {insight.get('recommendation', '')}")
                md_parts.append("")
        
        # Recommendations
        recs = insights.get("recommendations", [])
        if recs:
            md_parts.append("## Recommended Actions")
            md_parts.append("")
            md_parts.append("| Priority | Action | Impact |")
            md_parts.append("|----------|--------|--------|")
            for rec in recs[:5]:
                md_parts.append(f"| P{rec.get('priority', '?')} | {rec.get('action', '')[:100]} | {rec.get('impact', '?')}/100 |")
            md_parts.append("")
        
        # Confidence note
        conf = data_summary["confidence_score"]
        if conf < 50:
            md_parts.append("> ⚠️ **Confidence Note:** Analysis confidence is limited. Results should be validated with additional data or domain expertise.")
            md_parts.append("")
        
        # Footer
        md_parts.append("---")
        md_parts.append("*This report was generated by ACE V4 using embedded Gemini 2.0 Flash.*")
        
        markdown = "\n".join(md_parts)
        
        return {
            "markdown": markdown,
            "narrative": narrative,
            "domain": domain,
            "headline": headline_text,
            "insight_count": len(insights.get("insights", [])),
            "recommendation_count": len(recs),
            "data_summary": data_summary,
        }
    
    def _format_insights(self, insights: List[Dict]) -> str:
        """Format insights for LLM prompt."""
        lines = []
        for i, insight in enumerate(insights, 1):
            lines.append(f"{i}. **{insight.get('title', 'Insight')}**")
            lines.append(f"   Finding: {insight.get('finding', '')}")
            lines.append(f"   Impact: {insight.get('impact_score', 0)}/100, Confidence: {insight.get('confidence', 'medium')}")
            lines.append(f"   Category: {insight.get('category', '')}")
            lines.append("")
        return "\n".join(lines)
    
    def _format_recommendations(self, recs: List[Dict]) -> str:
        """Format recommendations for LLM prompt."""
        lines = []
        for rec in recs:
            lines.append(f"[P{rec.get('priority', '?')}] {rec.get('action', '')}")
        return "\n".join(lines) if lines else "(No recommendations yet)"


def main():
    """Command-line entry point."""
    if len(sys.argv) < 2:
        print("Usage: python executive_narrator.py <run_path>")
        sys.exit(1)
    
    run_path = sys.argv[1]
    state = StateManager(run_path)
    
    agent = ExecutiveNarratorAgent(state)
    try:
        result = agent.run()
        print(json.dumps(result, indent=2, default=str))
    except Exception as e:
        import traceback
        print(f"[ERROR] ExecutiveNarrator agent failed: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
