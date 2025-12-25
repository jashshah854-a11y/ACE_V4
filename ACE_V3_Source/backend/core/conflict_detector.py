import json
from pathlib import Path
from typing import Dict, Any


class ConflictDetector:
    """
    Lightweight conflict detector placeholder.
    In a fuller implementation, this would compare time-series trends vs correlation outputs vs forecasts.
    Here we load artifacts if present and emit a no-conflict report by default.
    """

    def __init__(self, state_manager):
        self.state_manager = state_manager
        self.run_path = Path(state_manager.run_path)

    def run_full_conflict_analysis(self) -> Dict[str, Any]:
        report = {
            "has_conflicts": False,
            "conflict_count": 0,
            "summary": "No conflicts detected",
        }
        conflict_path = self.run_path / "artifacts" / "conflict_report.json"
        conflict_path.parent.mkdir(parents=True, exist_ok=True)
        with open(conflict_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        return report
"""
Conflict Detection System - Phase One
Detects and handles conflicts between multiple data sources or signals.
Conflict is treated as an insight, not an error.
"""
from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np


class ConflictDetector:
    """Detects conflicts in data and analysis results."""
    
    def __init__(self, state_manager):
        """Initialize with a StateManager instance."""
        self.state = state_manager
    
    def detect_correlation_vs_trend_conflict(
        self,
        correlation_data: Dict[str, Any],
        trend_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Detect conflicts between historical correlation and recent trends.
        Example: Correlation suggests X, but recent trends show Y.
        """
        if not correlation_data or not trend_data:
            return None
        
        conflicts = []
        
        # Compare correlation direction with trend direction
        if "correlations" in correlation_data and "trends" in trend_data:
            for corr_field, corr_value in correlation_data.get("correlations", {}).items():
                if corr_field in trend_data.get("trends", {}):
                    trend_value = trend_data["trends"][corr_field]
                    
                    # Check if signs differ significantly
                    if isinstance(corr_value, (int, float)) and isinstance(trend_value, (int, float)):
                        if (corr_value > 0 and trend_value < -0.1) or (corr_value < 0 and trend_value > 0.1):
                            conflicts.append({
                                "field": corr_field,
                                "correlation_value": corr_value,
                                "trend_value": trend_value,
                                "type": "correlation_vs_trend",
                                "message": (
                                    f"Historical correlation suggests {'positive' if corr_value > 0 else 'negative'} "
                                    f"relationship for {corr_field}, but recent trends show "
                                    f"{'declining' if trend_value < 0 else 'increasing'} values. "
                                    f"Decisions should prioritize recent trends due to recency."
                                )
                            })
        
        if conflicts:
            return {
                "has_conflict": True,
                "conflicts": conflicts,
                "recommendation": "Prioritize recent trends over historical correlations",
            }
        
        return None
    
    def detect_model_vs_observation_conflict(
        self,
        model_predictions: Dict[str, Any],
        actual_observations: pd.DataFrame
    ) -> Optional[Dict[str, Any]]:
        """Detect conflicts between model predictions and actual observations."""
        if not model_predictions or actual_observations.empty:
            return None
        
        conflicts = []
        
        # Compare predicted vs actual for key metrics
        if "predictions" in model_predictions:
            pred_df = pd.DataFrame(model_predictions["predictions"])
            
            # Find common columns
            common_cols = set(pred_df.columns) & set(actual_observations.columns)
            
            for col in common_cols:
                if col in pred_df.columns and col in actual_observations.columns:
                    pred_mean = pred_df[col].mean()
                    actual_mean = actual_observations[col].mean()
                    
                    # Significant deviation (>20%)
                    if abs(pred_mean) > 0:
                        deviation_pct = abs((actual_mean - pred_mean) / pred_mean) * 100
                        if deviation_pct > 20:
                            conflicts.append({
                                "field": col,
                                "predicted": pred_mean,
                                "actual": actual_mean,
                                "deviation_pct": deviation_pct,
                                "type": "model_vs_observation",
                                "message": (
                                    f"Model predicted {pred_mean:.2f} for {col}, but actual is {actual_mean:.2f} "
                                    f"({deviation_pct:.1f}% deviation). Model may need recalibration."
                                )
                            })
        
        if conflicts:
            return {
                "has_conflict": True,
                "conflicts": conflicts,
                "recommendation": "Review model calibration and feature importance",
            }
        
        return None
    
    def detect_cluster_vs_segment_conflict(
        self,
        cluster_results: Dict[str, Any],
        segment_results: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Detect conflicts between clustering and segmentation results."""
        if not cluster_results or not segment_results:
            return None
        
        conflicts = []
        
        # Compare cluster assignments with segment assignments
        if "clusters" in cluster_results and "segments" in segment_results:
            cluster_counts = len(cluster_results.get("clusters", []))
            segment_counts = len(segment_results.get("segments", []))
            
            # Significant difference in count suggests different grouping logic
            if abs(cluster_counts - segment_counts) > max(cluster_counts, segment_counts) * 0.3:
                conflicts.append({
                    "type": "cluster_vs_segment",
                    "cluster_count": cluster_counts,
                    "segment_count": segment_counts,
                    "message": (
                        f"Clustering identified {cluster_counts} groups, but segmentation found {segment_counts}. "
                        f"These methods use different grouping criteria. Use both perspectives for comprehensive analysis."
                    )
                })
        
        if conflicts:
            return {
                "has_conflict": True,
                "conflicts": conflicts,
                "recommendation": "Consider both clustering and segmentation perspectives",
            }
        
        return None
    
    def detect_data_source_conflict(
        self,
        source_a: Dict[str, Any],
        source_b: Dict[str, Any],
        key_field: str
    ) -> Optional[Dict[str, Any]]:
        """
        Detect conflicts between two data sources on a key field.
        Example: Sales data says X, but inventory data says Y.
        """
        if not source_a or not source_b:
            return None
        
        conflicts = []
        
        # Compare values for common entities
        if key_field in source_a and key_field in source_b:
            # This is a simplified check - real implementation would join on key_field
            conflicts.append({
                "type": "data_source_conflict",
                "key_field": key_field,
                "message": (
                    f"Conflicting values detected between sources for {key_field}. "
                    f"Verify data freshness and source reliability."
                )
            })
        
        if conflicts:
            return {
                "has_conflict": True,
                "conflicts": conflicts,
                "recommendation": "Verify data source reliability and freshness",
            }
        
        return None
    
    def run_full_conflict_analysis(self) -> Dict[str, Any]:
        """Run comprehensive conflict detection across all available data."""
        all_conflicts = []
        
        # Load available artifacts
        correlation_data = self.state.read("correlation_analysis")
        trend_data = self.state.read("trend_analysis")
        model_data = self.state.read("regression_insights")
        cluster_data = self.state.read("overseer_output")
        segment_data = self.state.read("personas")
        
        # Check correlation vs trend
        conflict = self.detect_correlation_vs_trend_conflict(correlation_data, trend_data)
        if conflict:
            all_conflicts.append(conflict)
        
        # Check cluster vs segment
        conflict = self.detect_cluster_vs_segment_conflict(cluster_data, segment_data)
        if conflict:
            all_conflicts.append(conflict)
        
        # Store conflicts
        result = {
            "has_conflicts": len(all_conflicts) > 0,
            "conflict_count": len(all_conflicts),
            "conflicts": all_conflicts,
            "summary": (
                f"Detected {len(all_conflicts)} conflict(s). "
                "Conflicts represent different perspectives, not errors."
            )
        }
        
        self.state.write("conflict_analysis", result)
        return result

