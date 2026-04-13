"""
Narrative Engine - Translates technical analysis to executive language.

This module bridges the gap between boosting model outputs and human-readable
narratives, following the "precompute-and-prompt" pattern from the strategic docs.
"""
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import re


@dataclass
class NarrativeSection:
    """A section of the executive narrative."""
    title: str
    content: str
    confidence: float = 1.0
    evidence: Optional[str] = None


class NarrativeEngine:
    """
    Translates boosting/statistical outputs to executive language.
    
    Pattern: Technical Signal → Business Interpretation → Actionable Insight
    """
    
    # Domain-specific vocabulary mappings
    DOMAIN_TERMS = {
        "marketing_performance": {
            "revenue": "revenue",
            "conversions": "conversions",
            "clicks": "engagement",
            "impressions": "reach",
            "spend": "ad spend",
            "channel": "marketing channel",
        },
        "ecommerce": {
            "order_value": "order value",
            "purchase_frequency": "purchase frequency",
            "customer_id": "customer",
            "product_category": "category",
            "revenue": "revenue",
        },
        "saas": {
            "mrr": "monthly recurring revenue",
            "churn": "churn",
            "usage": "product usage",
            "logins": "engagement",
            "seats": "licenses",
        },
        "finance": {
            "transaction_amount": "transaction value",
            "risk_score": "risk level",
            "fraud_flag": "fraud indicator",
        },
        "healthcare": {
            "readmission": "readmission risk",
            "los": "length of stay",
            "diagnosis": "diagnosis category",
        },
        "hr": {
            "tenure": "employee tenure",
            "performance": "performance score",
            "attrition": "attrition risk",
            "salary": "compensation",
        },
    }
    
    # Correlation strength descriptions
    CORRELATION_STRENGTH = {
        (0.9, 1.0): "extremely strong",
        (0.7, 0.9): "strong",
        (0.5, 0.7): "moderate",
        (0.3, 0.5): "weak",
        (0.0, 0.3): "very weak",
    }
    
    def __init__(self, domain: str = "general"):
        self.domain = domain
        self.terms = self.DOMAIN_TERMS.get(domain, {})
    
    def _humanize_column(self, col: str) -> str:
        """Convert column_name to Column Name."""
        if col in self.terms:
            return self.terms[col]
        # Handle snake_case and camelCase
        humanized = re.sub(r'[_-]', ' ', col)
        humanized = re.sub(r'([a-z])([A-Z])', r'\1 \2', humanized)
        return humanized.title()
    
    def _get_correlation_strength(self, r: float) -> str:
        """Get human-readable correlation strength."""
        abs_r = abs(r)
        for (low, high), desc in self.CORRELATION_STRENGTH.items():
            if low <= abs_r <= high:
                return desc
        return "moderate"
    
    def _format_number(self, value: float, prefix: str = "", suffix: str = "") -> str:
        """Format numbers for readability."""
        if abs(value) >= 1_000_000:
            return f"{prefix}{value/1_000_000:.1f}M{suffix}"
        elif abs(value) >= 1_000:
            return f"{prefix}{value/1_000:.1f}K{suffix}"
        elif abs(value) < 1:
            return f"{prefix}{value:.2%}{suffix}" if value < 1 else f"{prefix}{value:.2f}{suffix}"
        else:
            return f"{prefix}{value:,.0f}{suffix}"
    
    # ==================== TRANSLATION FUNCTIONS ====================
    
    def translate_data_summary(
        self,
        row_count: int,
        col_count: int,
        primary_type: str,
        quality_score: float
    ) -> str:
        """Translate data overview to executive language."""
        domain_name = primary_type.replace("_", " ").title()
        quality_desc = "excellent" if quality_score > 0.9 else "good" if quality_score > 0.7 else "adequate"
        
        return (
            f"Your {domain_name.lower()} dataset contains **{row_count:,} records** "
            f"across **{col_count} attributes** with {quality_desc} data quality ({quality_score:.0%} completeness)."
        )
    
    def translate_correlation(
        self,
        feat1: str,
        feat2: str,
        r: float,
        direction: str = None
    ) -> str:
        """Translate correlation to business insight."""
        feat1_h = self._humanize_column(feat1)
        feat2_h = self._humanize_column(feat2)
        strength = self._get_correlation_strength(r)
        
        if r > 0:
            direction_text = "increase together"
            impact = "Higher {} is associated with higher {}.".format(feat1_h.lower(), feat2_h.lower())
        else:
            direction_text = "move in opposite directions"
            impact = "Higher {} is associated with lower {}.".format(feat1_h.lower(), feat2_h.lower())
        
        return f"**{feat1_h}** and **{feat2_h}** have a {strength} relationship (r={r:.2f}). {impact}"
    
    def translate_segment(
        self,
        segment_id: int,
        size: int,
        total: int,
        avg_value: float = None,
        key_traits: List[str] = None,
        persona_name: str = None
    ) -> Dict[str, Any]:
        """Translate cluster stats to segment narrative."""
        pct = (size / total) * 100 if total > 0 else 0
        
        # Use persona name or generate label
        if persona_name:
            name = persona_name
        else:
            labels = ["Champions", "Loyalists", "Potential", "At-Risk", "Dormant", "New"]
            name = labels[segment_id] if segment_id < len(labels) else f"Segment {segment_id + 1}"
        
        summary = f"**{name}** ({size:,} records, {pct:.1f}% of total)"
        
        if avg_value is not None:
            summary += f" - Average value: {self._format_number(avg_value, prefix='$')}"
        
        return {
            "name": name,
            "size": size,
            "percentage": pct,
            "summary": summary,
            "traits": key_traits or [],
        }
    
    def translate_driver(
        self,
        feature: str,
        importance: float,
        rank: int,
        target: str = None
    ) -> str:
        """Translate feature importance to business insight."""
        feat_h = self._humanize_column(feature)
        target_h = self._humanize_column(target) if target else "the outcome"
        
        if rank == 1:
            prefix = "**Top driver:**"
        elif rank <= 3:
            prefix = f"**#{rank}:**"
        else:
            prefix = f"#{rank}:"
        
        # Importance interpretation
        if importance > 50:
            impact = "This is a critical factor that significantly influences"
        elif importance > 20:
            impact = "This is an important factor affecting"
        else:
            impact = "This factor contributes to"
        
        return f"{prefix} {feat_h} ({importance:.1f}% importance). {impact} {target_h.lower()}."
    
    def translate_anomaly_finding(
        self,
        count: int,
        total: int,
        top_drivers: List[Dict[str, Any]] = None
    ) -> str:
        """Translate anomaly detection results."""
        pct = (count / total) * 100 if total > 0 else 0
        
        if count == 0:
            return "No significant anomalies detected in your data."
        
        severity = "critical" if pct > 5 else "notable" if pct > 1 else "minor"
        text = f"Detected **{count:,} anomalous records** ({pct:.1f}% of data) requiring review."
        
        if top_drivers:
            driver_names = [self._humanize_column(d.get("field", d.get("feature", ""))) for d in top_drivers[:3]]
            text += f" Key factors: {', '.join(driver_names)}."
        
        return text
    
    def translate_validation(
        self,
        checks: Dict[str, Any],
        mode: str
    ) -> str:
        """Translate validation results to confidence statement."""
        passed = sum(1 for c in checks.values() if c.get("ok"))
        total = len(checks)
        
        if mode == "limitations":
            return (
                "⚠️ **Limited Confidence**: Some analysis features are restricted due to data constraints. "
                "The insights below are directional only."
            )
        elif passed == total:
            return "✅ **High Confidence**: All data quality checks passed. Insights are reliable."
        else:
            return f"⚠️ **Moderate Confidence**: {passed}/{total} validation checks passed. Interpret with caution."
    
    def translate_shap_explanation(
        self,
        shap_result: Dict[str, Any],
        target_name: str = "outcome",
    ) -> str:
        """
        Translate SHAP explanations to natural language.
        
        This anchors LLM narratives in actual model decisions,
        following the CANDLE framework pattern.
        """
        if not shap_result or not shap_result.get("importance_ranking"):
            return ""
        
        lines = []
        rankings = shap_result["importance_ranking"]
        
        # Top driver with SHAP-grounded explanation
        top = rankings[0]
        feature = self._humanize_column(top["feature"])
        direction = "increases" if top.get("direction") == "positive" else "decreases"
        target_h = self._humanize_column(target_name)
        
        lines.append(
            f"**{feature}** is the strongest predictor of {target_h.lower()}. "
            f"Higher {feature.lower()} {direction} the predicted {target_h.lower()}."
        )
        
        # Second driver with relative comparison
        if len(rankings) > 1:
            second = rankings[1]
            feature2 = self._humanize_column(second["feature"])
            direction2 = "increases" if second.get("direction") == "positive" else "decreases"
            
            ratio = top["importance"] / second["importance"] if second["importance"] > 0 else float('inf')
            
            if ratio > 3:
                lines.append(
                    f"**{feature2}** is a secondary factor but has {ratio:.1f}x less influence."
                )
            else:
                lines.append(
                    f"**{feature2}** is nearly as important and {direction2} {target_h.lower()}."
                )
        
        # Summarize remaining top features
        if len(rankings) > 2:
            other_features = [
                self._humanize_column(r["feature"])
                for r in rankings[2:5]
            ]
            if other_features:
                lines.append(
                    f"Additional factors: {', '.join(other_features)}."
                )
        
        return " ".join(lines)
    
    # ==================== EXECUTIVE SUMMARY GENERATION ====================
    
    def generate_executive_summary(
        self,
        data_type: str,
        row_count: int,
        top_correlation: Dict[str, Any] = None,
        top_driver: Dict[str, Any] = None,
        segment_count: int = 0,
        anomaly_count: int = 0
    ) -> str:
        """Generate the Governing Thought - one paragraph that frames everything."""
        lines = []
        
        # Opening context
        domain_name = data_type.replace("_", " ").lower()
        lines.append(f"Analysis of your {domain_name} data reveals actionable patterns.")
        
        # Key finding
        if top_correlation:
            feat1 = self._humanize_column(top_correlation.get("feature1", ""))
            feat2 = self._humanize_column(top_correlation.get("feature2", ""))
            r = top_correlation.get("pearson", 0)
            if r > 0.7:
                lines.append(f"The strongest signal: **{feat1}** directly drives **{feat2}** (r={r:.2f}).")
        
        if top_driver:
            feat = self._humanize_column(top_driver.get("feature", ""))
            imp = top_driver.get("importance", 0)
            lines.append(f"**{feat}** is your most important lever at {imp:.0f}% influence.")
        
        if segment_count > 0:
            lines.append(f"Your customers naturally divide into **{segment_count} distinct segments** with different behaviors.")
        
        if anomaly_count > 0:
            lines.append(f"We flagged **{anomaly_count} records** for review.")
        
        return " ".join(lines)
    
    def generate_recommendations(
        self,
        correlations: List[Dict] = None,
        drivers: List[Dict] = None,
        segments: List[Dict] = None,
        domain: str = "general"
    ) -> List[Dict[str, str]]:
        """Generate actionable recommendations from analysis."""
        recs = []
        
        # Correlation-based recommendations
        if correlations:
            top = correlations[0]
            feat1 = self._humanize_column(top.get("feature1", ""))
            feat2 = self._humanize_column(top.get("feature2", ""))
            r = top.get("pearson", 0)
            
            if r > 0.7:
                recs.append({
                    "priority": "High",
                    "action": f"Focus on improving **{feat1}** to drive **{feat2}**",
                    "rationale": f"Strong correlation (r={r:.2f}) suggests direct impact",
                })
        
        # Driver-based recommendations
        if drivers and len(drivers) >= 2:
            top = drivers[0]
            second = drivers[1]
            top_feat = self._humanize_column(top.get("feature", ""))
            second_feat = self._humanize_column(second.get("feature", ""))
            
            recs.append({
                "priority": "High",
                "action": f"Prioritize **{top_feat}** optimization",
                "rationale": f"Highest predictive importance ({top.get('importance', 0):.0f}%)",
            })
            
            if second.get("importance", 0) > 15:
                recs.append({
                    "priority": "Medium",
                    "action": f"Monitor and improve **{second_feat}**",
                    "rationale": f"Second most important driver ({second.get('importance', 0):.0f}%)",
                })
        
        # Segment-based recommendations
        if segments:
            # Find highest value segment
            sorted_segs = sorted(segments, key=lambda x: x.get("avg_value", 0), reverse=True)
            if sorted_segs:
                top_seg = sorted_segs[0]
                recs.append({
                    "priority": "High",
                    "action": f"Protect and grow **{top_seg.get('name', 'top segment')}**",
                    "rationale": f"Highest value segment ({top_seg.get('size', 0):,} customers)",
                })
        
        return recs[:5]  # Max 5 recommendations


# Convenience function for quick translation
def create_narrative_engine(state_manager=None) -> NarrativeEngine:
    """Factory function to create a configured NarrativeEngine."""
    domain = "general"
    if state_manager:
        data_type = state_manager.read("data_type") or {}
        domain = data_type.get("primary_type", "general")
    return NarrativeEngine(domain=domain)
