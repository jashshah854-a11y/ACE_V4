"""
Deep Insight Agent - Cross-artifact pattern synthesis using LLM.

This agent reads ALL computed artifacts and uses Gemini to:
1. Identify non-obvious patterns across different analyses
2. Connect dots between correlations, anomalies, and distributions
3. Generate hypotheses about root causes
4. Rank insights by business impact
5. Produce actionable recommendations

This is the "interpretation layer" that transforms raw statistics
into executive-ready insights.
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, List
from dataclasses import dataclass, asdict

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from core.llm import call_gemini
from utils.logging import log_launch, log_ok, log_warn, log_info


@dataclass
class Insight:
    """A synthesized insight from the data."""
    title: str
    finding: str
    why_it_matters: str
    evidence: List[str]
    confidence: str  # low, medium, high
    impact_score: int  # 0-100
    category: str  # pattern, anomaly, trend, risk, opportunity
    recommendation: str = ""


class DeepInsightAgent:
    """Agent that synthesizes insights across all artifacts using LLM."""
    
    # Artifacts to load for context
    ARTIFACT_KEYS = [
        "data_profile",
        "enhanced_analytics",
        "anomalies",
        "time_series_analysis",
        "trust_object",
        "data_type",
        "schema_map",
        "data_validation_report",
    ]
    
    def __init__(self, state: StateManager):
        self.state = state
        self.artifacts = {}
        self.name = "DeepInsight"
        
    def run(self) -> Dict[str, Any]:
        """Main entry point."""
        log_launch(f"Agent {self.name}")
        
        # 1. Load all artifacts
        self._load_artifacts()
        
        # 2. Detect business domain
        domain = self._detect_domain()
        log_info(f"Detected domain: {domain}")
        
        # 3. Build comprehensive context for LLM
        context = self._build_context()
        
        # 4. Generate insights via multi-pass LLM
        log_info("Generating insights (Pass 1: Raw extraction)...")
        raw_insights = self._generate_insights_pass1(context, domain)
        
        log_info(f"Generated {len(raw_insights)} raw insights")
        
        # 5. CURIOSITY PASS: Look for unexpected patterns
        log_info("Curiosity pass: Looking for unexpected patterns...")
        curiosity_insights = self._curiosity_pass(context, domain)
        log_info(f"Found {len(curiosity_insights)} curiosity insights")
        
        # Merge raw and curiosity insights (deduplicated by title)
        seen_titles = {i.get("title", "").lower() for i in raw_insights}
        for ci in curiosity_insights:
            if ci.get("title", "").lower() not in seen_titles:
                raw_insights.append(ci)
                seen_titles.add(ci.get("title", "").lower())
        
        # 6. Refine with recommendations
        log_info("Refining insights (Pass 2: Adding recommendations)...")
        refined_insights = self._refine_insights_pass2(raw_insights, context)
        
        # 7. Rank by impact
        ranked_insights = self._rank_insights(refined_insights)
        
        # 8. Generate executive recommendations
        recommendations = self._generate_recommendations(ranked_insights)
        
        # 9. Build result
        result = {
            "status": "success",
            "domain_detected": domain,
            "insight_count": len(ranked_insights),
            "curiosity_insights_found": len(curiosity_insights),
            "insights": [asdict(i) for i in ranked_insights],
            "recommendations": recommendations,
            "headline_insight": asdict(ranked_insights[0]) if ranked_insights else None,
        }
        
        # Save to state
        self.state.write("deep_insights", result)
        
        log_ok(f"DeepInsight complete: {len(ranked_insights)} insights, {len(recommendations)} recommendations")
        return result
    
    def _load_artifacts(self):
        """Load all relevant artifacts from state."""
        for key in self.ARTIFACT_KEYS:
            data = self.state.read(key)
            if data:
                self.artifacts[key] = data
                
    def _detect_domain(self) -> str:
        """Detect the business domain from column names and data patterns."""
        profile = self.artifacts.get("data_profile", {})
        columns = list(profile.get("columns", {}).keys())
        col_string = " ".join(columns).lower()
        
        # Also check data type detection
        data_type = self.artifacts.get("data_type", {})
        primary_type = data_type.get("primary_type", "").lower()
        
        # Domain detection rules
        if any(w in col_string for w in ["game", "player", "score", "level", "genre", "steam", "appid"]):
            return "gaming"
        if any(w in col_string for w in ["price", "revenue", "sales", "order", "cart", "product"]):
            return "ecommerce"
        if any(w in col_string for w in ["ctr", "impression", "click", "campaign", "ad", "spend"]):
            return "marketing"
        if any(w in col_string for w in ["patient", "diagnosis", "treatment", "medical", "health"]):
            return "healthcare"
        if any(w in col_string for w in ["transaction", "balance", "account", "loan", "credit"]):
            return "finance"
        if "customer" in primary_type or "crm" in primary_type:
            return "crm"
        if "time_series" in primary_type:
            return "time_series"
            
        return "general"
    
    def _build_context(self) -> str:
        """Build comprehensive context string for LLM."""
        context_parts = []
        
        # Data overview
        profile = self.artifacts.get("data_profile", {})
        row_count = profile.get("row_count", 0)
        col_count = profile.get("column_count", 0)
        
        context_parts.append(f"""
## Dataset Overview
- Total Records: {row_count:,}
- Total Columns: {col_count}
- Column Types: {json.dumps(profile.get("column_types", {}), indent=2)}
""")
        
        # Key statistics per column
        columns = profile.get("columns", {})
        context_parts.append("\n## Column Statistics")
        for col_name, col_data in list(columns.items())[:12]:
            stats = col_data.get("stats", {})
            if stats:
                context_parts.append(f"""
### {col_name}
- Type: {col_data.get('inferred_type', 'unknown')}
- Mean: {stats.get('mean', 'N/A')}, Median: {stats.get('median', 'N/A')}
- Range: [{stats.get('min', 'N/A')}, {stats.get('max', 'N/A')}]
- Skewness: {stats.get('skew', 'N/A')}
- Missing: {col_data.get('missing_pct', 0):.2%}
""")
            elif col_data.get("top_values"):
                top_vals = list(col_data["top_values"].items())[:3]
                context_parts.append(f"""
### {col_name}
- Type: {col_data.get('inferred_type', 'categorical')}
- Top values: {top_vals}
- Unique count: {col_data.get('distinct_count', 'N/A')}
""")
        
        # Correlations
        enhanced = self.artifacts.get("enhanced_analytics", {})
        corr = enhanced.get("correlation_analysis", {})
        if corr.get("strong_correlations"):
            context_parts.append("\n## Strong Correlations")
            for c in corr["strong_correlations"][:8]:
                context_parts.append(
                    f"- {c.get('feature1', '?')} ↔ {c.get('feature2', '?')}: "
                    f"r={c.get('pearson', 0):.3f} ({c.get('strength', 'unknown')}, {c.get('direction', '?')})"
                )
        
        # Distribution highlights
        dist = enhanced.get("distribution_analysis", {})
        if dist.get("distributions"):
            context_parts.append("\n## Distribution Highlights")
            for col, data in list(dist["distributions"].items())[:6]:
                skew = data.get("skewness", 0)
                outliers = data.get("outlier_percentage", 0)
                if abs(skew) > 1 or outliers > 5:
                    context_parts.append(
                        f"- {col}: {data.get('distribution_type', '?')}, "
                        f"skew={skew:.2f}, outliers={outliers:.1f}%"
                    )
        
        # Anomalies
        anomalies = self.artifacts.get("anomalies", {})
        if anomalies.get("anomaly_count", 0) > 0:
            context_parts.append(f"""
## Anomalies Detected
- Total Count: {anomalies['anomaly_count']:,}
- Percentage: {anomalies['anomaly_count'] / row_count * 100:.1f}% of data
- Key Drivers: {json.dumps(dict(list(anomalies.get('drivers', {}).items())[:5]))}
""")
            # Include examples
            examples = anomalies.get("anomalies", [])[:5]
            if examples:
                context_parts.append("- Example anomalies:")
                for ex in examples:
                    # Truncate for context
                    ex_str = str(ex)[:200]
                    context_parts.append(f"  * {ex_str}")
        
        # Time series
        ts = self.artifacts.get("time_series_analysis", {})
        if ts.get("status") == "ok":
            analyses = ts.get("analyses", {})
            ts_key = list(analyses.keys())[0] if analyses else None
            if ts_key:
                ts_data = analyses[ts_key]
                trend = ts_data.get("trend", {})
                cp = ts_data.get("change_points", {})
                context_parts.append(f"""
## Time Series Patterns
- Date Column: {ts.get('datetime_column')}
- Date Range: {ts.get('date_range', {})}
- Trend Direction: {trend.get('direction', 'unknown')}
- Trend Change: {trend.get('total_pct_change', 0):.1f}%
- Change Points: {cp.get('count', 0)} detected
""")
                if cp.get("points"):
                    for point in cp["points"][:3]:
                        context_parts.append(
                            f"  * {point.get('date', '?')}: {point.get('shift_pct', 0):.1f}% shift"
                        )
        
        # Trust/Confidence
        trust = self.artifacts.get("trust_object", {})
        if trust:
            context_parts.append(f"""
## Data Confidence
- Overall Score: {trust.get('overall_confidence', 'N/A')}%
- Components: {json.dumps(dict((k, v.get('score')) for k, v in trust.get('components', {}).items()))}
""")
        
        return "\n".join(context_parts)
    
    def _generate_insights_pass1(self, context: str, domain: str) -> List[Dict]:
        """First pass: Generate raw insights from data."""
        
        prompt = f"""You are a senior data analyst specializing in {domain} data.
        
Given the following analysis results, identify the TOP 8 most important and NON-OBVIOUS insights.

For EACH insight:
1. What is the specific finding? (Use exact numbers from the data)
2. Why does it matter for business? (Business impact)
3. What evidence supports this? (Which analyses/columns)
4. Confidence: low/medium/high
5. Impact: 1-100 score (how significant is this for decision-making?)
6. Category: pattern | anomaly | trend | risk | opportunity

{context}

Return as JSON array:
[
  {{
    "title": "Short, punchy title (max 8 words)",
    "finding": "The specific insight with numbers...",
    "why_it_matters": "Business impact explanation...",
    "evidence": ["data_profile.column_name", "enhanced_analytics.correlation"],
    "confidence": "high",
    "impact_score": 85,
    "category": "pattern"
  }}
]

CRITICAL RULES:
- DO NOT simply restate statistics. Interpret what they MEAN.
- Look for HIDDEN patterns - things that connect multiple analyses
- Identify ANOMALIES that could indicate problems or opportunities
- Flag RISKS that decision-makers should know about
- Highlight OPPORTUNITIES for action
- Use specific numbers (e.g., "32.8% of records" not "many records")
- Consider what this data IMPLIES about the underlying business/domain
"""
        
        result = call_gemini(prompt, temperature=0.4, max_tokens=4096, parse_json=True)
        
        if isinstance(result, list):
            return result
        elif isinstance(result, dict) and result.get("error"):
            log_warn(f"Insight generation error: {result.get('error')}")
            return []
        return []
    
    def _curiosity_pass(self, context: str, domain: str) -> List[Dict]:
        """CURIOSITY PASS: Look for unexpected, weird, or non-obvious patterns.
        
        This pass uses higher temperature to encourage lateral thinking and
        specifically looks for:
        - Things that "don't fit" or are unexpected
        - Unusual combinations of values
        - Data quality issues that suggest problems
        - Edge cases that might be significant
        - Patterns that connect seemingly unrelated things
        """
        
        prompt = f"""You are a curious data detective. Your job is NOT to summarize statistics.
Instead, you are SEARCHING for things that seem WEIRD, UNEXPECTED, or DON'T FIT.

Think like a human analyst who says "Huh, that's strange..." when looking at data.

DOMAIN: {domain}

DATA CONTEXT:
{context}

I want you to find UP TO 5 things that are:
1. UNEXPECTED - Things that don't match typical patterns for {domain} data
2. SUSPICIOUS - Data combinations that might indicate data quality issues, fraud, or errors
3. OUTLIER STORIES - Individual extreme values that might tell an important story
4. HIDDEN CONNECTIONS - Non-obvious links between seemingly unrelated columns
5. MISSING PATTERNS - Things you would EXPECT to see but DON'T

For each "curiosity":
- What SPECIFICALLY caught your attention? (exact values, columns, combinations)
- WHY is this surprising or unusual?
- What MIGHT this indicate? (generate 2-3 hypotheses)
- What would you want to investigate further?

Return as JSON array:
[
  {{
    "title": "Short catchy title (e.g., 'Publisher with 100+ Games All Priced at $199')",
    "finding": "Specific observation with exact numbers...",
    "why_it_matters": "Why this is worth investigating...",
    "evidence": ["column_name", "statistic_source"],
    "confidence": "medium",
    "impact_score": 70,
    "category": "anomaly",
    "hypotheses": [
      "Hypothesis 1: What this might mean...",
      "Hypothesis 2: Alternative explanation..."
    ]
  }}
]

CRITICAL INSTRUCTIONS:
- DO NOT repeat obvious findings from standard analysis
- Focus on SURPRISES and ANOMALIES
- Think about what a human would notice and say "wait, that's odd"
- Consider data QUALITY issues as potential signals
- Look for things that might indicate FRAUD, ERRORS, or UNUSUAL BEHAVIOR
- Be SPECIFIC - use exact numbers and column names
- If you see nothing unusual, return an empty array - don't make things up
"""
        
        # Use higher temperature for more creative/lateral thinking
        result = call_gemini(prompt, temperature=0.7, max_tokens=3000, parse_json=True)
        
        if isinstance(result, list):
            # Add "curiosity" flag to distinguish these
            for item in result:
                item["source"] = "curiosity_pass"
            return result
        elif isinstance(result, dict) and result.get("error"):
            log_warn(f"Curiosity pass error: {result.get('error')}")
            return []
        return []
    
    def _refine_insights_pass2(self, raw_insights: List[Dict], context: str) -> List[Insight]:
        """Second pass: Refine and add specific recommendations."""
        refined = []
        
        for insight in raw_insights[:8]:
            # Generate specific recommendation for this insight
            prompt = f"""Given this insight: 
Title: {insight.get('title', '')}
Finding: {insight.get('finding', '')}
Category: {insight.get('category', '')}

Generate ONE specific, actionable recommendation.
Be concrete - what EXACTLY should someone do? Who? By when?

Context for reference:
{context[:1500]}

Return JSON:
{{
  "recommendation": "Specific action to take with who/what/when..."
}}
"""
            rec_result = call_gemini(prompt, temperature=0.2, max_tokens=300, parse_json=True)
            recommendation = ""
            if isinstance(rec_result, dict):
                recommendation = rec_result.get("recommendation", "")
            
            refined.append(Insight(
                title=insight.get("title", "Insight"),
                finding=insight.get("finding", ""),
                why_it_matters=insight.get("why_it_matters", ""),
                evidence=insight.get("evidence", []),
                confidence=insight.get("confidence", "medium"),
                impact_score=insight.get("impact_score", 50),
                category=insight.get("category", "pattern"),
                recommendation=recommendation,
            ))
        
        return refined
    
    def _rank_insights(self, insights: List[Insight]) -> List[Insight]:
        """Rank insights by composite score."""
        confidence_map = {"low": 0.3, "medium": 0.6, "high": 0.9}
        
        def score(insight: Insight) -> float:
            conf = confidence_map.get(insight.confidence, 0.5)
            # 60% impact, 40% confidence
            return (insight.impact_score * 0.6) + (conf * 100 * 0.4)
        
        return sorted(insights, key=score, reverse=True)
    
    def _generate_recommendations(self, insights: List[Insight]) -> List[Dict]:
        """Generate prioritized recommendation list from top insights."""
        recs = []
        for i, insight in enumerate(insights[:5]):
            if insight.recommendation:
                recs.append({
                    "priority": i + 1,
                    "action": insight.recommendation,
                    "based_on": insight.title,
                    "impact": insight.impact_score,
                    "category": insight.category,
                })
        return recs


def main():
    """Command-line entry point."""
    if len(sys.argv) < 2:
        print("Usage: python deep_insight.py <run_path>")
        sys.exit(1)
    
    run_path = sys.argv[1]
    state = StateManager(run_path)
    
    agent = DeepInsightAgent(state)
    try:
        result = agent.run()
        print(json.dumps(result, indent=2, default=str))
    except Exception as e:
        import traceback
        print(f"[ERROR] DeepInsight agent failed: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
