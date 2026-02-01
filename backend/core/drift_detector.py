"""
Drift Detection Module - Proactive intelligence for changing data.

Following the strategic documents:
"A hybrid implementation uses a simple XGBoost model to classify whether 
a record belongs to 'Month 1' or 'Month 2'. The most important features 
for this classifier reveal exactly which variables have drifted most 
significantly."

Supports:
- Distribution drift detection (KS-test, Jensen-Shannon)
- Concept drift detection (adversarial classifier)
- Narrative generation for drift insights
"""
from typing import Dict, Any, Optional, List, Tuple
import numpy as np
import pandas as pd
from dataclasses import dataclass
from datetime import datetime
import warnings


@dataclass
class DriftResult:
    """Result of drift detection analysis."""
    has_significant_drift: bool
    drift_score: float  # 0-1, higher = more drift
    drifted_features: List[Dict[str, Any]]
    stable_features: List[str]
    summary: str
    details: Dict[str, Any]


def compute_distribution_drift(
    baseline: pd.Series,
    current: pd.Series,
    method: str = "ks",
) -> Dict[str, Any]:
    """
    Compute distribution drift between two series.
    
    Args:
        baseline: Reference data series
        current: Current/new data series
        method: "ks" (Kolmogorov-Smirnov) or "js" (Jensen-Shannon)
    
    Returns:
        Dict with drift stats
    """
    from scipy import stats
    
    # Remove NaN values
    baseline_clean = baseline.dropna()
    current_clean = current.dropna()
    
    if len(baseline_clean) < 10 or len(current_clean) < 10:
        return {
            "method": method,
            "drift_detected": False,
            "p_value": 1.0,
            "statistic": 0.0,
            "error": "Insufficient data points",
        }
    
    try:
        if method == "ks":
            # Kolmogorov-Smirnov test
            statistic, p_value = stats.ks_2samp(baseline_clean, current_clean)
            drift_detected = p_value < 0.05
        elif method == "js":
            # Jensen-Shannon divergence (requires binning)
            all_data = pd.concat([baseline_clean, current_clean])
            bins = np.histogram_bin_edges(all_data, bins=20)
            
            baseline_hist, _ = np.histogram(baseline_clean, bins=bins, density=True)
            current_hist, _ = np.histogram(current_clean, bins=bins, density=True)
            
            # Add small epsilon to avoid log(0)
            baseline_hist = baseline_hist + 1e-10
            current_hist = current_hist + 1e-10
            
            # Normalize
            baseline_hist = baseline_hist / baseline_hist.sum()
            current_hist = current_hist / current_hist.sum()
            
            # Jensen-Shannon divergence
            m = 0.5 * (baseline_hist + current_hist)
            js_div = 0.5 * (stats.entropy(baseline_hist, m) + stats.entropy(current_hist, m))
            statistic = np.sqrt(js_div)  # JS distance
            p_value = None  # JS doesn't have p-value
            drift_detected = statistic > 0.1
        else:
            raise ValueError(f"Unknown method: {method}")
        
        return {
            "method": method,
            "drift_detected": drift_detected,
            "p_value": float(p_value) if p_value is not None else None,
            "statistic": float(statistic),
            "baseline_mean": float(baseline_clean.mean()),
            "current_mean": float(current_clean.mean()),
            "mean_shift": float(current_clean.mean() - baseline_clean.mean()),
            "mean_shift_pct": float((current_clean.mean() - baseline_clean.mean()) / baseline_clean.mean() * 100) if baseline_clean.mean() != 0 else 0,
        }
        
    except Exception as e:
        return {
            "method": method,
            "drift_detected": False,
            "error": str(e),
        }


def detect_drift_adversarial(
    baseline_df: pd.DataFrame,
    current_df: pd.DataFrame,
    feature_columns: List[str] = None,
    n_estimators: int = 50,
) -> DriftResult:
    """
    Detect drift using adversarial classifier approach.
    
    Train a classifier to distinguish baseline from current data.
    High accuracy = significant drift. Feature importances reveal
    which columns drifted most.
    
    Args:
        baseline_df: Reference/baseline dataset
        current_df: Current/new dataset  
        feature_columns: Columns to analyze (default: all numeric)
        n_estimators: Number of trees for classifier
    
    Returns:
        DriftResult with drift analysis
    """
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import cross_val_score
    
    # Select numeric columns
    if feature_columns is None:
        baseline_numeric = baseline_df.select_dtypes(include=[np.number])
        current_numeric = current_df.select_dtypes(include=[np.number])
        feature_columns = list(set(baseline_numeric.columns) & set(current_numeric.columns))
    
    if len(feature_columns) < 2:
        return DriftResult(
            has_significant_drift=False,
            drift_score=0.0,
            drifted_features=[],
            stable_features=feature_columns,
            summary="Insufficient numeric columns for drift detection.",
            details={"error": "Need at least 2 numeric columns"},
        )
    
    # Prepare adversarial dataset
    baseline_subset = baseline_df[feature_columns].copy()
    current_subset = current_df[feature_columns].copy()
    
    # Fill NaN with median
    for col in feature_columns:
        baseline_subset[col] = baseline_subset[col].fillna(baseline_subset[col].median())
        current_subset[col] = current_subset[col].fillna(current_subset[col].median())
    
    # Label: 0 = baseline, 1 = current
    baseline_subset["_drift_label"] = 0
    current_subset["_drift_label"] = 1
    
    combined = pd.concat([baseline_subset, current_subset], ignore_index=True)
    X = combined[feature_columns].values
    y = combined["_drift_label"].values
    
    # Train adversarial classifier
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        
        clf = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=5,
            random_state=42,
            n_jobs=-1,
        )
        
        # Cross-validate to get drift score
        # Score of 0.5 = no drift (can't distinguish)
        # Score of 1.0 = complete drift (perfectly distinguishable)
        scores = cross_val_score(clf, X, y, cv=5, scoring='roc_auc')
        drift_score = max(0, (scores.mean() - 0.5) * 2)  # Normalize to 0-1
        
        # Fit full model for feature importances
        clf.fit(X, y)
        importances = clf.feature_importances_
    
    # Rank features by drift importance
    feature_drifts = []
    for i, col in enumerate(feature_columns):
        # Also compute per-feature distribution drift
        dist_drift = compute_distribution_drift(
            baseline_df[col].dropna(),
            current_df[col].dropna()
        )
        
        feature_drifts.append({
            "feature": col,
            "importance": float(importances[i]),
            "drift_detected": dist_drift.get("drift_detected", False),
            "p_value": dist_drift.get("p_value"),
            "mean_shift_pct": dist_drift.get("mean_shift_pct", 0),
        })
    
    # Sort by importance
    feature_drifts = sorted(feature_drifts, key=lambda x: x["importance"], reverse=True)
    
    # Identify significantly drifted features
    drifted = [f for f in feature_drifts if f["drift_detected"] or f["importance"] > 0.15]
    stable = [f["feature"] for f in feature_drifts if f["feature"] not in [d["feature"] for d in drifted]]
    
    has_significant_drift = drift_score > 0.3 or len(drifted) > len(feature_columns) * 0.3
    
    # Generate summary
    if has_significant_drift:
        top_drifted = drifted[:3]
        top_names = [d["feature"] for d in top_drifted]
        summary = (
            f"Significant data drift detected (score: {drift_score:.0%}). "
            f"Top drifting features: {', '.join(top_names)}. "
            f"Consider retraining models."
        )
    else:
        summary = f"No significant drift detected (score: {drift_score:.0%}). Data distributions are stable."
    
    return DriftResult(
        has_significant_drift=has_significant_drift,
        drift_score=drift_score,
        drifted_features=drifted,
        stable_features=stable,
        summary=summary,
        details={
            "adversarial_auc": float(scores.mean()),
            "adversarial_auc_std": float(scores.std()),
            "n_baseline_rows": len(baseline_df),
            "n_current_rows": len(current_df),
            "n_features_analyzed": len(feature_columns),
        },
    )


def generate_drift_narrative(
    result: DriftResult,
    target_name: str = "predictions",
) -> str:
    """
    Generate executive-friendly narrative about drift.
    
    Integrates with NarrativeEngine pattern.
    """
    if not result.has_significant_drift:
        return (
            f"**Data Stability**: Your data patterns remain consistent. "
            f"No significant drift detected (stability score: {1-result.drift_score:.0%}). "
            f"Current models should continue performing as expected."
        )
    
    lines = []
    
    # Opening
    lines.append(
        f"⚠️ **Data Drift Alert**: Significant changes detected in your data "
        f"(drift score: {result.drift_score:.0%})."
    )
    
    # Top drifted features
    if result.drifted_features:
        top = result.drifted_features[0]
        feature_name = top["feature"].replace("_", " ").title()
        shift = top.get("mean_shift_pct", 0)
        
        if shift != 0:
            direction = "increased" if shift > 0 else "decreased"
            lines.append(
                f"**{feature_name}** has {direction} by {abs(shift):.1f}% compared to baseline."
            )
        else:
            lines.append(
                f"**{feature_name}** shows the largest distribution change."
            )
        
        if len(result.drifted_features) > 1:
            other_names = [f["feature"].replace("_", " ").title() 
                          for f in result.drifted_features[1:3]]
            lines.append(f"Also affected: {', '.join(other_names)}.")
    
    # Recommendation
    lines.append(
        f"**Recommendation**: Review recent data collection processes and consider "
        f"retraining {target_name} models to maintain accuracy."
    )
    
    return " ".join(lines)


def compare_time_periods(
    df: pd.DataFrame,
    date_column: str,
    split_date: str = None,
    feature_columns: List[str] = None,
) -> DriftResult:
    """
    Compare two time periods in the same dataset for drift.
    
    Args:
        df: DataFrame with date column
        date_column: Name of date column
        split_date: Date to split on (default: midpoint)
        feature_columns: Columns to analyze
    
    Returns:
        DriftResult comparing before/after split_date
    """
    # Parse dates
    df = df.copy()
    df[date_column] = pd.to_datetime(df[date_column])
    
    # Default split: midpoint
    if split_date is None:
        split_date = df[date_column].median()
    else:
        split_date = pd.to_datetime(split_date)
    
    baseline = df[df[date_column] < split_date]
    current = df[df[date_column] >= split_date]
    
    if len(baseline) < 50 or len(current) < 50:
        return DriftResult(
            has_significant_drift=False,
            drift_score=0.0,
            drifted_features=[],
            stable_features=[],
            summary="Insufficient data in one or both time periods.",
            details={"error": "Need at least 50 rows in each period"},
        )
    
    result = detect_drift_adversarial(baseline, current, feature_columns)
    
    # Add time period info to details
    result.details["baseline_period"] = f"Before {split_date.date()}"
    result.details["current_period"] = f"After {split_date.date()}"
    
    return result
