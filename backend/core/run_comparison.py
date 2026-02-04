"""Run comparison utilities for ACE V4.

Compares metrics, features, and results between multiple runs.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pathlib import Path


def compare_runs(
    run_data: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Compare multiple run results.

    Args:
        run_data: List of dicts containing run_id and snapshot data

    Returns:
        Comparison report with metrics, deltas, and insights
    """
    if len(run_data) < 2:
        return {"error": "Need at least 2 runs to compare"}

    comparison: Dict[str, Any] = {
        "runs": [r["run_id"] for r in run_data],
        "run_count": len(run_data),
        "metrics_comparison": {},
        "feature_comparison": {},
        "model_comparison": {},
        "quality_comparison": {},
        "insights": [],
    }

    # Extract comparable data from each run
    runs_metrics = []
    runs_features = []
    runs_models = []
    runs_quality = []

    for run in run_data:
        run_id = run["run_id"]
        snapshot = run.get("snapshot", {})

        # Model metrics
        model_artifacts = snapshot.get("model_artifacts") or {}
        model_fit = model_artifacts.get("model_fit_report") or {}
        metrics = model_fit.get("metrics", {})
        baseline = model_fit.get("baseline_metrics", {})

        runs_metrics.append({
            "run_id": run_id,
            "model": model_fit.get("model"),
            "target": model_fit.get("target_column"),
            "metrics": metrics,
            "baseline": baseline,
        })

        # Feature importance
        importance = model_artifacts.get("importance_report") or {}
        features = importance.get("features", [])
        runs_features.append({
            "run_id": run_id,
            "features": {f["feature"]: f["importance"] for f in features[:10]},
        })

        # Model info
        runs_models.append({
            "run_id": run_id,
            "model_type": model_fit.get("model"),
            "target_type": model_fit.get("target_type"),
            "train_rows": model_fit.get("dataset_split", {}).get("train_rows"),
            "test_rows": model_fit.get("dataset_split", {}).get("test_rows"),
        })

        # Data quality
        diagnostics = snapshot.get("diagnostics") or {}
        quality = diagnostics.get("data_quality") or {}
        identity = snapshot.get("identity", {}).get("identity") or {}

        runs_quality.append({
            "run_id": run_id,
            "row_count": identity.get("row_count"),
            "column_count": identity.get("column_count"),
            "quality_score": quality.get("score") or quality.get("overall_score"),
        })

    # Compare metrics
    comparison["metrics_comparison"] = _compare_metrics(runs_metrics)

    # Compare features
    comparison["feature_comparison"] = _compare_features(runs_features)

    # Compare models
    comparison["model_comparison"] = runs_models

    # Compare quality
    comparison["quality_comparison"] = runs_quality

    # Generate insights
    comparison["insights"] = _generate_comparison_insights(comparison)

    return comparison


def _compare_metrics(runs_metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compare model metrics across runs."""
    if not runs_metrics:
        return {}

    # Collect all metric keys
    all_metrics = set()
    for run in runs_metrics:
        all_metrics.update(run.get("metrics", {}).keys())

    # Build comparison table
    metrics_table = {}
    for metric in all_metrics:
        values = []
        for run in runs_metrics:
            val = run.get("metrics", {}).get(metric)
            values.append({
                "run_id": run["run_id"],
                "value": val,
            })

        # Calculate stats
        numeric_vals = [v["value"] for v in values if isinstance(v["value"], (int, float))]
        if numeric_vals:
            best_val = max(numeric_vals) if metric in {"r2", "accuracy", "f1", "auc"} else min(numeric_vals)
            best_run = next(
                v["run_id"] for v in values
                if v["value"] == best_val
            )
            metrics_table[metric] = {
                "values": values,
                "best_run": best_run,
                "best_value": best_val,
                "delta": round(max(numeric_vals) - min(numeric_vals), 4) if len(numeric_vals) > 1 else 0,
            }

    return metrics_table


def _compare_features(runs_features: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compare feature importance across runs."""
    if not runs_features:
        return {}

    # Collect all features
    all_features = set()
    for run in runs_features:
        all_features.update(run.get("features", {}).keys())

    # Build comparison
    feature_table = {}
    for feature in list(all_features)[:15]:  # Top 15
        values = []
        for run in runs_features:
            val = run.get("features", {}).get(feature, 0)
            values.append({
                "run_id": run["run_id"],
                "importance": val,
            })
        feature_table[feature] = values

    # Find consistent top features
    consistent_features = []
    for feature in all_features:
        appearances = sum(
            1 for run in runs_features
            if feature in run.get("features", {})
        )
        if appearances == len(runs_features):
            avg_importance = sum(
                run.get("features", {}).get(feature, 0)
                for run in runs_features
            ) / len(runs_features)
            consistent_features.append({
                "feature": feature,
                "avg_importance": round(avg_importance, 2),
            })

    consistent_features.sort(key=lambda x: x["avg_importance"], reverse=True)

    return {
        "feature_table": feature_table,
        "consistent_top_features": consistent_features[:5],
        "total_unique_features": len(all_features),
    }


def _generate_comparison_insights(comparison: Dict[str, Any]) -> List[str]:
    """Generate human-readable insights from comparison."""
    insights = []

    # Metrics insights
    metrics = comparison.get("metrics_comparison", {})

    for metric, data in metrics.items():
        delta = data.get("delta", 0)
        if metric == "r2" and delta > 0.1:
            insights.append(f"R² varies significantly across runs (delta={delta:.2f}), suggesting different model fits.")
        elif metric == "accuracy" and delta > 0.05:
            insights.append(f"Accuracy varies by {delta:.1%} across runs.")
        elif metric in {"mae", "rmse"} and delta > 0:
            best = data.get("best_run")
            insights.append(f"Run '{best[:8]}' achieves best {metric.upper()} ({data['best_value']:.3f}).")

    # Feature insights
    features = comparison.get("feature_comparison", {})
    consistent = features.get("consistent_top_features", [])

    if consistent:
        top_feature = consistent[0]["feature"]
        insights.append(f"'{top_feature}' is consistently the top driver across all runs.")

    if len(consistent) >= 3:
        insights.append(f"{len(consistent)} features appear as top drivers in all compared runs.")

    # Quality insights
    quality = comparison.get("quality_comparison", [])
    if quality:
        scores = [q.get("quality_score") for q in quality if q.get("quality_score") is not None]
        if scores and max(scores) - min(scores) > 0.1:
            insights.append("Data quality scores vary significantly between runs - check data preprocessing.")

    return insights
