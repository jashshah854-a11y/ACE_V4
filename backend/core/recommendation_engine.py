"""ML-driven recommendation engine for ACE V4.

Aggregates signals from enhanced analytics, model artifacts, and personas
to generate prioritized, actionable recommendations.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional


def generate_recommendations(
    enhanced_analytics: Optional[Dict[str, Any]] = None,
    model_artifacts: Optional[Dict[str, Any]] = None,
    personas: Optional[List[Dict[str, Any]]] = None,
    strategies: Optional[List[Dict[str, Any]]] = None,
    time_series: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Generate prioritized recommendations from all available signals.

    Returns a dict with categorized recommendations, each scored by
    confidence and expected impact.
    """
    signals = _aggregate_signals(
        enhanced_analytics or {},
        model_artifacts or {},
        personas or [],
        time_series or {},
    )

    all_recs: List[Dict[str, Any]] = []

    all_recs.extend(_feature_driver_recs(signals))
    all_recs.extend(_segment_recs(signals))
    all_recs.extend(_churn_risk_recs(signals))
    all_recs.extend(_correlation_recs(signals))
    all_recs.extend(_data_quality_recs(signals))
    all_recs.extend(_time_series_recs(signals))
    all_recs.extend(_monetization_recs(signals))

    # Score and rank
    for rec in all_recs:
        rec["score"] = _score_recommendation(rec)

    all_recs.sort(key=lambda r: r["score"], reverse=True)

    # Deduplicate similar recommendations
    all_recs = _deduplicate(all_recs)

    # Assign final priority based on rank
    for i, rec in enumerate(all_recs):
        if i < 3:
            rec["priority"] = "Critical"
        elif i < 6:
            rec["priority"] = "High"
        elif i < 10:
            rec["priority"] = "Medium"
        else:
            rec["priority"] = "Low"

    return {
        "status": "ok",
        "valid": True,
        "available": True,
        "total_count": len(all_recs),
        "recommendations": all_recs[:15],
        "by_category": _group_by_category(all_recs[:15]),
        "signal_summary": {
            "n_features": len(signals.get("top_drivers", [])),
            "n_segments": len(signals.get("segments", [])),
            "has_churn_signal": signals.get("churn_risk") is not None,
            "has_time_series": bool(signals.get("time_series_analyses")),
            "data_quality_score": signals.get("quality_score"),
        },
    }


def _aggregate_signals(
    analytics: Dict[str, Any],
    artifacts: Dict[str, Any],
    personas: List[Dict[str, Any]],
    time_series: Dict[str, Any],
) -> Dict[str, Any]:
    """Collect all available signals into a flat structure."""
    signals: Dict[str, Any] = {}

    # Feature importance
    importance = artifacts.get("importance_report") or {}
    features = importance.get("features", [])
    signals["top_drivers"] = features[:10] if features else []

    # Model fit
    model_fit = artifacts.get("model_fit_report") or {}
    signals["model_type"] = model_fit.get("model")
    signals["target_column"] = model_fit.get("target_column")
    signals["target_type"] = model_fit.get("target_type")
    signals["model_metrics"] = model_fit.get("metrics", {})
    signals["baseline_metrics"] = model_fit.get("baseline_metrics", {})
    signals["model_selection"] = model_fit.get("model_selection", {})

    # Correlations
    corr = analytics.get("correlation_analysis") or {}
    signals["strong_correlations"] = corr.get("strong_correlations", [])

    # Business intelligence
    bi = analytics.get("business_intelligence") or {}
    signals["value_metrics"] = bi.get("value_metrics")
    signals["segment_value"] = bi.get("segment_value", [])
    signals["churn_risk"] = bi.get("churn_risk")
    signals["clv_proxy"] = bi.get("clv_proxy")
    signals["ghost_revenue"] = bi.get("ghost_revenue")
    signals["zombie_cohorts"] = bi.get("zombie_cohorts")
    signals["bi_insights"] = bi.get("insights", [])

    # Distributions
    dist = analytics.get("distribution_analysis") or {}
    signals["distributions"] = dist.get("distributions", {})
    signals["distribution_insights"] = dist.get("insights", [])

    # Quality
    quality = analytics.get("quality_metrics") or {}
    signals["quality_score"] = quality.get("overall_score") or quality.get("score")

    # Personas
    signals["segments"] = personas

    # Time series
    if time_series.get("status") == "ok":
        signals["time_series_analyses"] = time_series.get("analyses", {})
        signals["time_series_insights"] = time_series.get("insights", [])

    return signals


def _feature_driver_recs(signals: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate recommendations from top feature drivers."""
    recs = []
    drivers = signals.get("top_drivers", [])
    target = signals.get("target_column", "outcome")

    for i, driver in enumerate(drivers[:3]):
        feature = driver.get("feature", "")
        importance = driver.get("importance", 0)
        if importance < 1:
            continue

        # Check if this feature also appears in correlations
        corr_strength = None
        for c in signals.get("strong_correlations", []):
            if feature in (c.get("feature1"), c.get("feature2")):
                corr_strength = abs(c.get("pearson", 0))
                break

        rec = {
            "category": "feature_optimization",
            "action": f"Optimize '{feature}' to improve {target}",
            "rationale": f"Top {'#' + str(i+1)} driver with {importance:.1f}% importance",
            "confidence": min(0.95, importance / 100 + 0.3),
            "impact": "high" if importance > 20 else "medium" if importance > 10 else "low",
            "lever": feature,
            "data_points": {"importance": round(importance, 2)},
        }

        if corr_strength and corr_strength > 0.5:
            rec["rationale"] += f" and strong correlation (r={corr_strength:.2f})"
            rec["confidence"] = min(0.98, rec["confidence"] + 0.1)

        recs.append(rec)

    return recs


def _segment_recs(signals: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate recommendations per customer segment."""
    recs = []
    segments = signals.get("segment_value", [])

    if not segments:
        return recs

    # Find highest and lowest value segments
    sorted_segs = sorted(segments, key=lambda s: s.get("total_value", 0), reverse=True)

    if sorted_segs:
        top = sorted_segs[0]
        contrib = top.get("value_contribution_pct", 0)
        recs.append({
            "category": "segment_strategy",
            "action": f"Protect and grow '{top.get('segment', 'Top Segment')}' cohort",
            "rationale": f"Highest value segment contributing {contrib:.0f}% of total value with {top.get('size', 0)} customers",
            "confidence": 0.85,
            "impact": "high",
            "lever": "retention",
            "data_points": {
                "segment": top.get("segment"),
                "total_value": top.get("total_value"),
                "contribution_pct": contrib,
            },
        })

    if len(sorted_segs) > 1:
        bottom = sorted_segs[-1]
        avg_val = bottom.get("avg_value", 0)
        top_avg = sorted_segs[0].get("avg_value", 1)
        if top_avg > 0 and avg_val / top_avg < 0.3:
            recs.append({
                "category": "segment_strategy",
                "action": f"Uplift '{bottom.get('segment', 'Bottom Segment')}' through targeted engagement",
                "rationale": f"Lowest per-customer value ({avg_val:.0f} avg) with room for growth",
                "confidence": 0.7,
                "impact": "medium",
                "lever": "engagement",
                "data_points": {
                    "segment": bottom.get("segment"),
                    "avg_value": avg_val,
                    "gap_to_top": round((1 - avg_val / max(top_avg, 1)) * 100, 1),
                },
            })

    return recs


def _churn_risk_recs(signals: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate recommendations from churn risk signals."""
    recs = []
    churn = signals.get("churn_risk")
    if not churn:
        return recs

    at_risk_pct = churn.get("at_risk_percentage", 0)
    at_risk_count = churn.get("at_risk_count", 0)

    if at_risk_pct > 5:
        severity = "Critical" if at_risk_pct > 25 else "High" if at_risk_pct > 15 else "Medium"
        recs.append({
            "category": "risk_mitigation",
            "action": f"Launch retention campaign for {at_risk_count:,} at-risk customers ({at_risk_pct:.1f}%)",
            "rationale": f"{at_risk_pct:.1f}% of customers show churn risk signals based on activity levels",
            "confidence": 0.8,
            "impact": "high" if at_risk_pct > 15 else "medium",
            "lever": "retention",
            "data_points": {
                "at_risk_count": at_risk_count,
                "at_risk_percentage": at_risk_pct,
                "threshold": churn.get("low_activity_threshold"),
            },
        })

    return recs


def _correlation_recs(signals: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate recommendations from strong correlations."""
    recs = []
    correlations = signals.get("strong_correlations", [])

    # Only generate recs for correlations not already covered by drivers
    driver_features = {d.get("feature") for d in signals.get("top_drivers", [])}

    for corr in correlations[:5]:
        f1 = corr.get("feature1", "")
        f2 = corr.get("feature2", "")
        r = abs(corr.get("pearson", 0))

        # Skip if both features are already in drivers
        if f1 in driver_features and f2 in driver_features:
            continue

        if r > 0.6:
            direction = corr.get("direction", "positive")
            recs.append({
                "category": "relationship_leverage",
                "action": f"Leverage the {direction} relationship between '{f1}' and '{f2}'",
                "rationale": f"Strong correlation (r={r:.2f}) suggests improving one drives the other",
                "confidence": min(0.9, r),
                "impact": "medium" if r < 0.75 else "high",
                "lever": f1 if f1 not in driver_features else f2,
                "data_points": {
                    "feature1": f1,
                    "feature2": f2,
                    "correlation": round(r, 3),
                    "direction": direction,
                },
            })

    return recs


def _data_quality_recs(signals: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate recommendations from data quality issues."""
    recs = []
    quality_score = signals.get("quality_score")

    if quality_score is not None and quality_score < 0.7:
        recs.append({
            "category": "data_improvement",
            "action": "Improve data collection to fill gaps and increase analysis confidence",
            "rationale": f"Data quality score is {quality_score:.0%}, limiting analysis reliability",
            "confidence": 0.95,
            "impact": "high" if quality_score < 0.5 else "medium",
            "lever": "data_pipeline",
            "data_points": {"quality_score": quality_score},
        })

    # Check distributions for heavy skew or outliers
    distributions = signals.get("distributions", {})
    high_outlier_features = []
    for feature, dist in distributions.items():
        if isinstance(dist, dict):
            outlier_pct = dist.get("outlier_percentage", 0)
            if outlier_pct > 5:
                high_outlier_features.append((feature, outlier_pct))

    if high_outlier_features:
        worst = sorted(high_outlier_features, key=lambda x: x[1], reverse=True)[0]
        recs.append({
            "category": "data_improvement",
            "action": f"Investigate outliers in '{worst[0]}' ({worst[1]:.1f}% outlier rate)",
            "rationale": f"{len(high_outlier_features)} features have high outlier rates which may skew results",
            "confidence": 0.75,
            "impact": "medium",
            "lever": "data_cleaning",
            "data_points": {
                "features_with_outliers": len(high_outlier_features),
                "worst_feature": worst[0],
                "worst_outlier_pct": worst[1],
            },
        })

    return recs


def _time_series_recs(signals: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate recommendations from time series analysis."""
    recs = []
    analyses = signals.get("time_series_analyses", {})

    for col, analysis in analyses.items():
        # Trend-based recommendations
        trend = analysis.get("trend", {})
        direction = trend.get("direction", "")
        pct_change = trend.get("total_pct_change", 0)

        if direction == "decreasing" and abs(pct_change) > 10:
            recs.append({
                "category": "trend_action",
                "action": f"Address declining '{col}' trend ({pct_change:+.1f}% total change)",
                "rationale": f"Statistically significant downward trend detected",
                "confidence": min(0.9, 1 - trend.get("p_value", 0.5)),
                "impact": "high" if abs(pct_change) > 25 else "medium",
                "lever": col,
                "data_points": {
                    "direction": direction,
                    "pct_change": pct_change,
                    "r_squared": trend.get("r_squared"),
                },
            })
        elif direction == "increasing" and pct_change > 20:
            recs.append({
                "category": "trend_action",
                "action": f"Capitalize on growing '{col}' trend ({pct_change:+.1f}% total change)",
                "rationale": "Strong upward momentum - consider scaling investments",
                "confidence": min(0.85, 1 - trend.get("p_value", 0.5)),
                "impact": "medium",
                "lever": col,
                "data_points": {
                    "direction": direction,
                    "pct_change": pct_change,
                },
            })

        # Volatility recommendations
        volatility = analysis.get("volatility", {})
        if volatility.get("volatility_trend") == "increasing":
            recs.append({
                "category": "risk_mitigation",
                "action": f"Monitor increasing volatility in '{col}'",
                "rationale": "Growing variance suggests increasing uncertainty or market instability",
                "confidence": 0.7,
                "impact": "medium",
                "lever": "monitoring",
                "data_points": {"metric": col, "volatility": volatility.get("mean_volatility")},
            })

        # Change point recommendations
        change = analysis.get("change_points", {})
        if change.get("detected"):
            points = change.get("points", [])
            if points:
                latest = points[-1]
                shift = latest.get("shift_pct", 0)
                recs.append({
                    "category": "investigation",
                    "action": f"Investigate structural shift in '{col}' ({shift:+.1f}% change)",
                    "rationale": f"Detected {change.get('count', 1)} change point(s) - identify root cause",
                    "confidence": 0.75,
                    "impact": "medium",
                    "lever": "analysis",
                    "data_points": {
                        "change_points": change.get("count"),
                        "latest_shift_pct": shift,
                        "latest_date": latest.get("date"),
                    },
                })

    return recs


def _monetization_recs(signals: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generate recommendations from ghost revenue and zombie cohorts."""
    recs = []

    ghost = signals.get("ghost_revenue")
    if ghost and isinstance(ghost, dict):
        ghost_count = ghost.get("count", 0)
        if ghost_count > 0:
            recs.append({
                "category": "revenue_optimization",
                "action": f"Monetize {ghost_count:,} high-engagement, zero-revenue users",
                "rationale": "Ghost revenue users show high activity but no revenue conversion",
                "confidence": 0.8,
                "impact": "high" if ghost_count > 50 else "medium",
                "lever": "pricing",
                "data_points": {"ghost_count": ghost_count},
            })

    zombies = signals.get("zombie_cohorts")
    if zombies and isinstance(zombies, dict):
        zombie_count = zombies.get("count", 0)
        if zombie_count > 0:
            recs.append({
                "category": "cost_optimization",
                "action": f"Evaluate {zombie_count:,} active-but-zero-value users for cost reduction",
                "rationale": "Zombie cohort consumes resources without contributing value",
                "confidence": 0.7,
                "impact": "medium",
                "lever": "operations",
                "data_points": {"zombie_count": zombie_count},
            })

    return recs


def _score_recommendation(rec: Dict[str, Any]) -> float:
    """Score a recommendation based on confidence and impact."""
    confidence = rec.get("confidence", 0.5)
    impact_map = {"high": 3, "medium": 2, "low": 1}
    impact_score = impact_map.get(rec.get("impact", "low"), 1)

    # Category weight (some categories inherently more actionable)
    category_weight = {
        "feature_optimization": 1.2,
        "risk_mitigation": 1.15,
        "revenue_optimization": 1.1,
        "segment_strategy": 1.05,
        "trend_action": 1.0,
        "relationship_leverage": 0.95,
        "cost_optimization": 0.9,
        "investigation": 0.85,
        "data_improvement": 0.8,
    }
    cat_w = category_weight.get(rec.get("category", ""), 1.0)

    return round(confidence * impact_score * cat_w, 4)


def _deduplicate(recs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Remove near-duplicate recommendations."""
    seen_levers = set()
    unique = []
    for rec in recs:
        lever = rec.get("lever", "")
        category = rec.get("category", "")
        key = f"{category}:{lever}"
        if key not in seen_levers:
            seen_levers.add(key)
            unique.append(rec)
    return unique


def _group_by_category(recs: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """Group recommendations by category."""
    groups: Dict[str, List[Dict[str, Any]]] = {}
    for rec in recs:
        cat = rec.get("category", "other")
        groups.setdefault(cat, []).append(rec)
    return groups
