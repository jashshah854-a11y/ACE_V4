"""
Smart Narrative Generator - LLM-powered insights generation.

This module uses Gemini to generate human-readable, contextual narratives
from raw analytics data, similar to how an AI analyst would interpret the data.
"""

import os
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

# Set the API key before importing genai
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "GEMINI_KEY_REDACTED")
os.environ["GEMINI_API_KEY"] = GEMINI_API_KEY

try:
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    GENAI_AVAILABLE = True
except ImportError:
    genai = None
    GENAI_AVAILABLE = False
    print("[SmartNarrative] google-generativeai not installed")


MODEL_NAME = "gemini-2.0-flash"


@dataclass
class SmartNarrative:
    """Container for LLM-generated narrative."""
    executive_summary: str
    key_findings: List[str]
    data_story: str
    recommendations: List[Dict[str, str]]
    warnings: List[str]
    generated_at: str
    model_used: str


def generate_smart_narrative(
    snapshot: Dict[str, Any],
    run_id: str = "unknown"
) -> Dict[str, Any]:
    """
    Generate a smart, contextual narrative from analytics snapshot using Gemini.

    This is the main entry point - it takes the full snapshot and generates
    human-readable insights that explain what the data means.

    Args:
        snapshot: The full run snapshot containing identity, analytics, artifacts, etc.
        run_id: The run ID for reference

    Returns:
        Dict containing the generated narrative sections
    """
    if not GENAI_AVAILABLE:
        return _generate_fallback_narrative(snapshot)

    try:
        # Extract key data from snapshot
        context = _extract_context(snapshot)

        # Generate narrative using Gemini
        narrative = _call_gemini_for_narrative(context)

        # Add metadata
        from datetime import datetime
        narrative["generated_at"] = datetime.utcnow().isoformat()
        narrative["model_used"] = MODEL_NAME
        narrative["run_id"] = run_id

        return narrative

    except Exception as e:
        print(f"[SmartNarrative] Error generating narrative: {e}")
        return _generate_fallback_narrative(snapshot)


def _extract_context(snapshot: Dict[str, Any]) -> Dict[str, Any]:
    """Extract relevant context from snapshot for the LLM prompt."""
    context = {
        "identity": {},
        "analytics": {},
        "model": {},
        "quality": {},
    }

    # Identity information
    identity = snapshot.get("identity", {})
    if isinstance(identity, dict):
        id_data = identity.get("identity", identity)
        context["identity"] = {
            "row_count": id_data.get("row_count", 0),
            "column_count": id_data.get("column_count", 0),
            "columns": list(id_data.get("columns", {}).keys())[:20],  # Top 20 columns
            "quality_score": id_data.get("quality_score", 0),
            "data_type": id_data.get("data_type", {}).get("primary_type", "unknown"),
        }

        # Column stats
        columns = id_data.get("columns", {})
        numeric_cols = []
        categorical_cols = []
        for col_name, col_info in list(columns.items())[:15]:
            dtype = (col_info.get("dtype") or col_info.get("type") or "").lower()
            if "int" in dtype or "float" in dtype:
                numeric_cols.append({
                    "name": col_name,
                    "mean": col_info.get("mean"),
                    "min": col_info.get("min"),
                    "max": col_info.get("max"),
                    "null_pct": col_info.get("null_pct", 0),
                })
            else:
                categorical_cols.append({
                    "name": col_name,
                    "unique": col_info.get("unique"),
                    "null_pct": col_info.get("null_pct", 0),
                })

        context["identity"]["numeric_columns"] = numeric_cols
        context["identity"]["categorical_columns"] = categorical_cols

    # Enhanced analytics
    enhanced = snapshot.get("enhanced_analytics", {})
    if enhanced:
        # Correlations
        corr = enhanced.get("correlation_analysis", {})
        strong_corrs = corr.get("strong_correlations", [])[:5]
        context["analytics"]["top_correlations"] = [
            {
                "col1": c.get("column1"),
                "col2": c.get("column2"),
                "r": c.get("correlation"),
            }
            for c in strong_corrs
        ]

        # Distributions
        dist = enhanced.get("distribution_analysis", {})
        distributions = dist.get("distributions", {})
        context["analytics"]["distributions"] = {
            k: {
                "mean": v.get("mean"),
                "skewness": v.get("skewness"),
                "outlier_pct": v.get("outlier_percentage"),
            }
            for k, v in list(distributions.items())[:8]
        }

        # Business Intelligence
        bi = enhanced.get("business_intelligence", {})
        if bi:
            context["analytics"]["business_intelligence"] = {
                "value_metrics": bi.get("value_metrics"),
                "insights": bi.get("insights", [])[:5],
            }

    # Model artifacts
    artifacts = snapshot.get("model_artifacts", {})
    if artifacts:
        # Feature importance
        importance = artifacts.get("importance_report", {})
        features = importance.get("features", [])
        if not features:
            features = artifacts.get("feature_importance", [])

        context["model"]["top_features"] = [
            {"name": f.get("feature") or f.get("name"), "importance": f.get("importance")}
            for f in features[:8]
        ]

        # Model fit
        fit = artifacts.get("model_fit_report", {})
        if fit:
            context["model"]["metrics"] = fit.get("metrics", {})
            context["model"]["target"] = fit.get("target_column")

    # Diagnostics / Quality
    diag = snapshot.get("diagnostics", {})
    if diag:
        context["quality"] = {
            "data_quality_score": diag.get("data_quality_score"),
            "mode": diag.get("mode"),
            "target_candidate": diag.get("target_candidate", {}).get("column"),
        }

    # Trust
    trust = snapshot.get("trust", {})
    if trust:
        context["trust"] = {
            "score": trust.get("score") or trust.get("trust_score"),
            "level": trust.get("level") or trust.get("trust_level"),
        }

    return context


def _call_gemini_for_narrative(context: Dict[str, Any]) -> Dict[str, Any]:
    """Call Gemini API to generate the narrative."""

    prompt = f"""You are a senior data analyst presenting findings to a business executive.
Given the following analysis results, write a clear, insightful narrative that explains
what the data means in plain business language.

ANALYSIS CONTEXT:
{json.dumps(context, indent=2, default=str)}

Generate a response in this exact JSON format:
{{
    "executive_summary": "A 2-3 sentence summary of the most important finding. Start with the headline insight, like 'Your dataset of X records reveals that Y is the primary driver of Z.'",

    "key_findings": [
        "Finding 1 - specific, quantified insight with context",
        "Finding 2 - another key insight",
        "Finding 3 - another key insight",
        "Finding 4 - another key insight (if applicable)",
        "Finding 5 - another key insight (if applicable)"
    ],

    "data_story": "A 3-4 paragraph narrative that tells the story of this data. What does it represent? What patterns emerge? What's surprising or expected? Write as if explaining to a smart but non-technical executive.",

    "recommendations": [
        {{
            "title": "Short action title",
            "description": "Detailed recommendation based on the data",
            "priority": "High/Medium/Low"
        }}
    ],

    "warnings": [
        "Any data quality issues or caveats to be aware of"
    ]
}}

GUIDELINES:
- Use specific numbers and percentages from the data
- Explain correlations in cause-and-effect terms where appropriate
- Highlight the most actionable insights first
- If feature importance is available, explain which factors matter most
- Be direct and confident in your language
- Avoid jargon - translate technical terms to business language
- If data quality is poor, acknowledge limitations
- Format numbers with commas (e.g., 65,521 not 65521)

Return ONLY valid JSON, no markdown fences or explanation."""

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.3,
                max_output_tokens=4096,
            )
        )

        text = response.text.strip()

        # Clean up response if wrapped in markdown
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].strip()
        if text.endswith("```"):
            text = text[:-3].strip()

        return json.loads(text)

    except json.JSONDecodeError as e:
        print(f"[SmartNarrative] JSON parse error: {e}")
        return _generate_fallback_narrative({"context": context})
    except Exception as e:
        print(f"[SmartNarrative] Gemini API error: {e}")
        return _generate_fallback_narrative({"context": context})


def _generate_fallback_narrative(snapshot: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a basic narrative when LLM is unavailable."""
    identity = snapshot.get("identity", {})
    if isinstance(identity, dict):
        id_data = identity.get("identity", identity)
    else:
        id_data = {}

    row_count = id_data.get("row_count", 0)
    col_count = id_data.get("column_count", 0)

    return {
        "executive_summary": f"Analysis of {row_count:,} records across {col_count} variables completed. Review the detailed metrics below for insights.",
        "key_findings": [
            f"Dataset contains {row_count:,} records",
            f"Analysis covered {col_count} variables",
            "See Analytics tab for detailed breakdowns",
        ],
        "data_story": (
            f"This dataset contains {row_count:,} records with {col_count} attributes. "
            "The analysis engine has processed the data to identify patterns, correlations, "
            "and key drivers. Review the individual sections for specific insights about "
            "distributions, relationships between variables, and predictive factors."
        ),
        "recommendations": [
            {
                "title": "Review Key Metrics",
                "description": "Examine the correlation analysis and feature importance to understand main drivers.",
                "priority": "High"
            }
        ],
        "warnings": ["LLM narrative generation unavailable - showing basic summary"],
        "generated_at": "",
        "model_used": "fallback",
    }


def generate_narrative_for_run(state_manager) -> Dict[str, Any]:
    """
    Generate and save narrative for a run using the StateManager.

    This is called by the pipeline after analysis is complete.
    """
    # Build a snapshot-like dict from state
    snapshot = {
        "identity": state_manager.read("identity"),
        "enhanced_analytics": state_manager.read("enhanced_analytics"),
        "model_artifacts": {
            "importance_report": state_manager.read("importance_report"),
            "model_fit_report": state_manager.read("model_fit_report"),
            "feature_importance": state_manager.read("feature_importance"),
        },
        "diagnostics": state_manager.read("diagnostics"),
        "trust": state_manager.read("trust"),
    }

    run_id = state_manager.run_path.name if hasattr(state_manager, 'run_path') else "unknown"

    # Generate narrative
    narrative = generate_smart_narrative(snapshot, run_id)

    # Save to state
    state_manager.write("smart_narrative", narrative)

    return narrative
