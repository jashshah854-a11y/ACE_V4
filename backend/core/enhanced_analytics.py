"""
Enhanced Analytics Module - Advanced Statistical and Business Intelligence Analysis

Provides:
- Correlation analysis and feature relationships
- Statistical distribution analysis
- Business intelligence metrics (CLV, churn risk, segmentation value)
- Feature importance and predictive insights
- Advanced data quality metrics
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any, TYPE_CHECKING
from scipy import stats
from scipy.stats import pearsonr, spearmanr, chi2_contingency
from sklearn.preprocessing import StandardScaler
import warnings
import re
import math

warnings.filterwarnings('ignore')

from .analyst_core import ModelSelector, ModelGovernanceError
from .explainability import persist_evidence
from .evidence_standards import (
    EvidenceObject,
    create_evidence,
    should_enable_predictive_mode,
    get_analysis_mode,
    QUALITY_THRESHOLD
)
from .analytics_validation import (
    validate_correlation_analysis,
    validate_correlation_ci,
    validate_feature_importance,
    validate_redundancy_report,
)

if TYPE_CHECKING:  # pragma: no cover
    from .state_manager import StateManager


def safe_float(val: Any) -> float:
    """Sanitize float values to prevent JSON serialization errors."""
    if val is None:
        return 0.0
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return 0.0
        return f
    except (ValueError, TypeError):
        return 0.0


def _is_number(value: Any) -> bool:
    try:
        if value is None:
            return False
        float(value)
        return True
    except (TypeError, ValueError):
        return False


def _is_id_column(name: str) -> bool:
    lowered = name.lower()
    if lowered in {"id", "index", "uuid", "guid"}:
        return True
    if lowered.endswith("_id") or lowered.startswith("id_"):
        return True
    return any(token in lowered for token in ("uuid", "guid", "identifier"))


def _near_constant(series: pd.Series, threshold: float = 0.98) -> bool:
    values = series.dropna()
    if values.empty:
        return True
    top_ratio = values.value_counts(normalize=True).iloc[0]
    return float(top_ratio) >= threshold


def _coerce_numeric(series: pd.Series) -> pd.Series:
    cleaned = series.astype(str).str.replace(r"[,$]", "", regex=True)
    return pd.to_numeric(cleaned, errors="coerce")


class EnhancedAnalytics:
    """Advanced analytics engine for comprehensive data analysis"""

    def __init__(
        self,
        df: pd.DataFrame,
        schema_map: Optional[Dict] = None,
        state_manager: Optional["StateManager"] = None,
    ):
        """
        Initialize with dataframe and optional schema map

        Args:
            df: Input dataframe
            schema_map: Schema mapping for semantic understanding
        """
        self.df = df.copy()
        self.schema_map = schema_map
        self.numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        self.categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        self.state_manager = state_manager

    def compute_correlation_matrix(self) -> Dict[str, Any]:
        """
        Compute comprehensive correlation analysis

        Returns:
            Dictionary with correlation matrices and insights
        """
        if len(self.numeric_cols) < 2:
            return {"available": False, "reason": "Insufficient numeric columns"}

        numeric_df = self.df[self.numeric_cols].fillna(self.df[self.numeric_cols].mean())

        # Pearson correlation (linear relationships)
        pearson_corr = numeric_df.corr(method='pearson')

        # Spearman correlation (monotonic relationships)
        spearman_corr = numeric_df.corr(method='spearman')

        # Find strong correlations and potential leakage
        strong_correlations = []
        suspicious_leakage = []
        correlation_ci = []
        
        for i in range(len(pearson_corr.columns)):
            for j in range(i + 1, len(pearson_corr.columns)):
                col1, col2 = pearson_corr.columns[i], pearson_corr.columns[j]
                pearson_val = pearson_corr.iloc[i, j]
                spearman_val = spearman_corr.iloc[i, j]
                
                max_corr = max(abs(pearson_val), abs(spearman_val))

                # LEAKAGE CHECK: Perfect or near-perfect correlation (r > 0.99)
                # This usually indicates one variable is derived from the other (e.g. income -> reward_points)
                if max_corr > 0.99:
                    suspicious_leakage.append(f"{col1} ↔ {col2} (r={max_corr:.4f})")
                    # Downgrade reliability context in metadata if state manager exists
                    if self.state_manager:
                        self.state_manager.add_warning(
                            "DATA_LEAKAGE_POSSIBLE",
                            f"Likely data leakage detected: {col1} and {col2} are perfectly correlated.",
                        )

                # Consider correlation strong if |r| > 0.5
                if max_corr > 0.5:
                    n = int(self.df[[col1, col2]].dropna().shape[0])
                    ci_low = None
                    ci_high = None
                    if n > 3 and abs(pearson_val) < 1:
                        z = np.arctanh(float(pearson_val))
                        se = 1.0 / np.sqrt(n - 3)
                        z_low = z - 1.96 * se
                        z_high = z + 1.96 * se
                        ci_low = float(np.tanh(z_low))
                        ci_high = float(np.tanh(z_high))
                    correlation_ci.append(
                        {
                            "feature1": col1,
                            "feature2": col2,
                            "pearson": float(pearson_val),
                            "ci_low": ci_low,
                            "ci_high": ci_high,
                            "n": n,
                        }
                    )
                    strong_correlations.append({
                        "feature1": col1,
                        "feature2": col2,
                        "pearson": float(pearson_val),
                        "spearman": float(spearman_val),
                        "pearson_ci_low": ci_low,
                        "pearson_ci_high": ci_high,
                        "n": n,
                        "strength": self._correlation_strength(max_corr),
                        "direction": "positive" if pearson_val > 0 else "negative",
                        "is_leakage": max_corr > 0.99
                    })

        # Sort by strength
        strong_correlations.sort(key=lambda x: max(abs(x['pearson']), abs(x['spearman'])), reverse=True)

        return {
            "available": True,
            "pearson_matrix": pearson_corr.to_dict(),
            "spearman_matrix": spearman_corr.to_dict(),
            "strong_correlations": strong_correlations[:10],  # Top 10
            "total_correlations": len(strong_correlations),
            "features": self.numeric_cols,
            "leakage_warnings": suspicious_leakage,
            "insights": self._generate_correlation_insights(strong_correlations),
            "correlation_ci": correlation_ci[:10],
        }

    def analyze_distributions(self) -> Dict[str, Any]:
        """
        Analyze statistical distributions of numeric features

        Returns:
            Distribution statistics and normality tests
        """
        if not self.numeric_cols:
            return {"available": False, "reason": "No numeric columns"}

        distributions = {}

        for col in self.numeric_cols:
            data = self.df[col].dropna()

            if len(data) < 3:
                continue

            # Basic statistics
            mean_val = float(data.mean())
            median_val = float(data.median())
            std_val = float(data.std())

            # Distribution shape
            skewness = float(stats.skew(data))
            kurtosis = float(stats.kurtosis(data))

            # Normality test (Shapiro-Wilk for small samples, Anderson for large)
            if len(data) <= 5000:
                stat, p_value = stats.shapiro(data)
                normality_test = "shapiro"
            else:
                # Use sample for large datasets
                sample = data.sample(min(5000, len(data)), random_state=42)
                stat, p_value = stats.shapiro(sample)
                normality_test = "shapiro_sampled"

            is_normal = p_value > 0.05

            # Distribution type
            dist_type = self._classify_distribution(skewness, kurtosis, is_normal)

            # Quartiles for box plot
            q1 = float(data.quantile(0.25))
            q3 = float(data.quantile(0.75))
            iqr = q3 - q1

            # Outlier bounds
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            outlier_count = int(((data < lower_bound) | (data > upper_bound)).sum())

            distributions[col] = {
                "mean": mean_val,
                "median": median_val,
                "std": std_val,
                "min": float(data.min()),
                "max": float(data.max()),
                "skewness": skewness,
                "kurtosis": kurtosis,
                "is_normal": is_normal,
                "normality_p_value": float(p_value),
                "distribution_type": dist_type,
                "quartiles": {"q1": q1, "q2": median_val, "q3": q3},
                "iqr": iqr,
                "outlier_count": outlier_count,
                "outlier_percentage": float(outlier_count / len(data) * 100)
            }

        return {
            "available": True,
            "distributions": distributions,
            "insights": self._generate_distribution_insights(distributions)
        }

    def compute_redundancy_report(self) -> Dict[str, Any]:
        """
        Identify redundant features based on constants, near-constants, and high correlations.
        """
        constants = []
        near_constants = []
        for col in self.df.columns:
            series = self.df[col]
            if series.dropna().nunique() <= 1:
                constants.append(col)
            elif _near_constant(series):
                near_constants.append(col)

        redundant_pairs = []
        if len(self.numeric_cols) >= 2:
            numeric_df = self.df[self.numeric_cols].fillna(self.df[self.numeric_cols].mean())
            corr = numeric_df.corr(method="pearson")
            cols = list(corr.columns)
            for i in range(len(cols)):
                for j in range(i + 1, len(cols)):
                    value = corr.iloc[i, j]
                    if not _is_number(value):
                        continue
                    if abs(float(value)) >= 0.98:
                        redundant_pairs.append(
                            {
                                "feature1": cols[i],
                                "feature2": cols[j],
                                "correlation": float(value),
                            }
                        )
            redundant_pairs.sort(key=lambda x: abs(x["correlation"]), reverse=True)

        return {
            "available": True,
            "constants": constants,
            "near_constants": near_constants,
            "redundant_pairs": redundant_pairs[:10],
            "redundant_pair_count": len(redundant_pairs),
            "thresholds": {"near_constant": 0.98, "correlation": 0.98},
        }

    def compute_feature_importance(self, target_col: Optional[str] = None) -> Dict[str, Any]:
        """Compute feature importance via white-box models enforced by governance."""
        if len(self.numeric_cols) < 2:
            return {"available": False, "reason": "Insufficient features"}

        if target_col is None:
            target_col = self._infer_target_column()

        if target_col is None or target_col not in self.df.columns:
            return {"available": False, "reason": "No valid target column"}

        feature_cols = []
        for col in self.numeric_cols:
            if col == target_col:
                continue
            if _is_id_column(col):
                continue
            series = self.df[col]
            if series.dropna().nunique() <= 1:
                continue
            if _near_constant(series):
                continue
            feature_cols.append(col)
        X = self.df[feature_cols].fillna(self.df[feature_cols].mean())
        y = self.df[target_col].fillna(self.df[target_col].mean())

        if len(X) < 10:
            return {"available": False, "reason": "Insufficient samples"}

        is_regression = len(y.unique()) > 10
        selector = ModelSelector()
        try:
            selector.ensure_supervised_allowed(len(X), len(feature_cols))
        except ModelGovernanceError as exc:
            return {"available": False, "reason": str(exc), "downgraded": True}

        model = selector.get_regressor() if is_regression else selector.get_classifier()
        try:
            model.fit(X, y)
        except Exception as exc:
            return {"available": False, "reason": f"Model training failed: {exc}"}

        importances = [entry.as_dict() for entry in model.get_feature_importance()]
        
        # NORMALIZATION FIX:
        # Raw coefficients (e.g., 2.65) cannot be treated as percentages.
        # We must normalize them relative to the sum of absolute importances.
        total_importance = sum(imp["importance"] for imp in importances)
        if total_importance > 0:
            for imp in importances:
                imp["importance"] = imp["importance"] / total_importance
        
        evidence = model.get_evidence().to_payload()
        confidence_interval = model.get_confidence_interval()
        artifacts = model.serialize_artifacts()
        evidence_id = None
        if self.state_manager is not None:
            evidence_id = persist_evidence(self.state_manager, evidence, scope="feature_importance")

        return {
            "available": True,
            "target": target_col,
            "task_type": "regression" if is_regression else "classification",
            "feature_importance": importances[:15],
            "total_features": len(feature_cols),
            "confidence_interval": confidence_interval,
            "evidence": evidence,
            "evidence_id": evidence_id,
            "coefficients": artifacts.get("coefficients") if isinstance(artifacts, dict) else None,
            "insights": self._generate_importance_insights([(imp["feature"], imp["importance"]) for imp in importances], target_col),
        }

    def compute_business_intelligence(self, cluster_labels: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """
        Compute business intelligence metrics

        Args:
            cluster_labels: Optional cluster assignments for segment analysis

        Returns:
            Business metrics and insights
        """
        metrics = {"evidence": {}}

        # Try to find value-related columns
        value_col = self._find_column_by_role(['revenue', 'value', 'amount', 'sales', 'total', 'price', 'cost', 'profit', 'budget'])
        time_col = self._find_column_by_role(['date', 'time', 'timestamp', 'created', 'month'])

        if value_col:
            values = _coerce_numeric(self.df[value_col]).fillna(0)
            metrics["evidence"]["value_column"] = value_col

            metrics['value_metrics'] = {
                "total_value": safe_float(values.sum()),
                "avg_value": safe_float(values.mean()),
                "median_value": safe_float(values.median()),
                "top_10_percent_value": safe_float(values.quantile(0.9)),
                "value_concentration": safe_float(self._compute_gini_coefficient(values))
            }

            # Customer Lifetime Value proxy
            if len(self.df) > 0:
                avg_value_per_record = values.mean()
                record_count = len(self.df)

                metrics['clv_proxy'] = {
                    "avg_value_per_record": safe_float(avg_value_per_record),
                    "estimated_total_value": safe_float(avg_value_per_record * record_count),
                    "high_value_threshold": safe_float(values.quantile(0.75)),
                    "high_value_count": int((values > values.quantile(0.75)).sum())
                }

        # Segment value analysis
        if cluster_labels is not None and value_col:
            segment_values = []
            for cluster_id in np.unique(cluster_labels):
                cluster_mask = cluster_labels == cluster_id
                cluster_value = values[cluster_mask].sum()
                cluster_avg = values[cluster_mask].mean()
                cluster_size = cluster_mask.sum()

                segment_values.append({
                    "segment": f"Cluster {cluster_id}",
                    "total_value": float(cluster_value),
                    "avg_value": float(cluster_avg),
                    "size": int(cluster_size),
                    "value_per_member": float(cluster_avg),
                    "value_contribution_pct": float(cluster_value / values.sum() * 100)
                })

            segment_values.sort(key=lambda x: x['total_value'], reverse=True)
            metrics['segment_value'] = segment_values
            metrics["evidence"]["segment_value_column"] = value_col

        # Churn risk proxy (if we have activity/engagement metrics)
        activity_col = self._find_column_by_role(['activity', 'engagement', 'visits', 'sessions', 'transactions'])
        if activity_col:
            activity = _coerce_numeric(self.df[activity_col]).fillna(0)

            # Low activity as churn risk
            low_activity_threshold = activity.quantile(0.25)
            at_risk_count = int((activity <= low_activity_threshold).sum())

            metrics['churn_risk'] = {
                "at_risk_count": int(at_risk_count),
                "at_risk_percentage": safe_float(at_risk_count / len(self.df) * 100),
                "avg_activity": safe_float(activity.mean()),
                "low_activity_threshold": safe_float(low_activity_threshold),
                "activity_column": activity_col
            }
            metrics["evidence"]["churn_activity_column"] = activity_col
            
            # PHASE 9: Ghost Revenue Detection
            # High-engagement users with zero revenue = monetization opportunities
            revenue_col = self._find_column_by_role(['revenue', 'spend', 'payment', 'purchase', 'sales'])
            if revenue_col:
                revenue = _coerce_numeric(self.df[revenue_col]).fillna(0)
                activity_threshold_75 = activity.quantile(0.75)
                
                # Ghost users: High activity BUT zero revenue
                ghost_users = (activity > activity_threshold_75) & (revenue == 0)
                ghost_count = int(ghost_users.sum())
                
                if ghost_count > 0:
                    metrics['ghost_revenue'] = {
                        "ghost_user_count": ghost_count,
                        "ghost_user_percentage": safe_float(ghost_count / len(self.df) * 100),
                        "avg_ghost_activity": safe_float(activity[ghost_users].mean()),
                        "activity_threshold_75": safe_float(activity_threshold_75),
                        "opportunity_segment": "High-Engagement, Zero-Revenue",
                        "activity_column": activity_col,
                        "revenue_column": revenue_col
                    }
                    metrics["evidence"]["ghost_revenue_columns"] = [activity_col, revenue_col]
            
            # PHASE 9: Zombie Cohorts Detection
            # Active users generating zero value = dead weight
            value_col = self._find_column_by_role(['value', 'ltv', 'lifetime_value', 'total_value'])
            active_col = self._find_column_by_role(['active', 'status', 'is_active'])
            
            if value_col and active_col:
                try:
                    # Handle boolean or string active status
                    if self.df[active_col].dtype == 'bool':
                        is_active = self.df[active_col]
                    else:
                        # Assume 'active', 'Active', 'true', 'True', 1 mean active
                        is_active = self.df[active_col].astype(str).str.lower().isin(['active', 'true', '1'])
                    
                    total_value = _coerce_numeric(self.df[value_col]).fillna(0)
                    
                    # Zombies: Active BUT zero value
                    zombies = is_active & (total_value == 0)
                    zombie_count = int(zombies.sum())
                    
                    if zombie_count > 0:
                        metrics['zombie_cohorts'] = {
                            "zombie_count": zombie_count,
                            "zombie_percentage": safe_float(zombie_count / len(self.df) * 100),
                            "zombie_segment": "Active, Zero-Value",
                            "active_column": active_col,
                            "value_column": value_col
                        }
                        metrics["evidence"]["zombie_cohort_columns"] = [active_col, value_col]
                except Exception as e:
                    # Silently skip if zombie detection fails
                    pass

        restaurant_risk = self._compute_restaurant_risk()
        if restaurant_risk:
            metrics["restaurant_risk"] = restaurant_risk
            evidence_cols = restaurant_risk.get("evidence_columns")
            if evidence_cols:
                metrics["evidence"]["restaurant_risk_columns"] = evidence_cols

        marketing_risk = self._compute_marketing_risk()
        if marketing_risk:
            metrics["marketing_risk"] = marketing_risk
            evidence_cols = marketing_risk.get("evidence_columns")
            if evidence_cols:
                metrics["evidence"]["marketing_risk_columns"] = evidence_cols

        marketing_simulation = self._compute_marketing_simulation()
        if marketing_simulation:
            metrics["marketing_simulation"] = marketing_simulation
            evidence_cols = marketing_simulation.get("evidence_columns")
            if evidence_cols:
                metrics["evidence"]["marketing_simulation_columns"] = evidence_cols

        if len([k for k in metrics.keys() if k != "evidence"]) == 0:
            return {"available": False, "reason": "Insufficient business-related columns"}

        metrics['available'] = True
        metrics['insights'] = self._generate_bi_insights(metrics)

        return metrics

    def compute_advanced_quality_metrics(self) -> Dict[str, Any]:
        """
        Compute advanced data quality metrics

        Returns:
            Comprehensive quality assessment
        """
        total_cells = self.df.shape[0] * self.df.shape[1]
        missing_cells = self.df.isnull().sum().sum()

        # Completeness by column
        completeness_by_col = {}
        for col in self.df.columns:
            completeness = float((1 - self.df[col].isnull().sum() / len(self.df)) * 100)
            completeness_by_col[col] = completeness

        # Uniqueness for potential ID columns
        uniqueness_ratios = {}
        for col in self.df.columns:
            unique_count = self.df[col].nunique()
            uniqueness_ratios[col] = float(unique_count / len(self.df))

        # Consistency checks (coefficient of variation for numeric)
        consistency_scores = {}
        for col in self.numeric_cols:
            data = self.df[col].dropna()
            if len(data) > 0 and data.mean() != 0:
                cv = float(data.std() / data.mean())
                consistency_scores[col] = {
                    "coefficient_of_variation": cv,
                    "is_consistent": cv < 1.0  # Low CV means more consistent
                }

        return {
            "available": True,
            "overall_completeness": float((1 - missing_cells / total_cells) * 100),
            "completeness_by_column": completeness_by_col,
            "uniqueness_ratios": uniqueness_ratios,
            "consistency_scores": consistency_scores,
            "total_records": len(self.df),
            "total_features": len(self.df.columns),
            "numeric_features": len(self.numeric_cols),
            "categorical_features": len(self.categorical_cols),
            "insights": self._generate_quality_insights(completeness_by_col, consistency_scores)
        }

    # Helper methods

    def _correlation_strength(self, value: float) -> str:
        """Classify correlation strength"""
        abs_val = abs(value)
        if abs_val >= 0.7:
            return "very_strong"
        elif abs_val >= 0.4:
            return "strong"
        elif abs_val >= 0.2:
            return "moderate"
        else:
            return "weak"

    def _classify_distribution(self, skewness: float, kurtosis: float, is_normal: bool) -> str:
        """Classify distribution type"""
        if is_normal:
            return "normal"
        elif abs(skewness) < 0.5:
            return "symmetric"
        elif skewness > 0.5:
            return "right_skewed"
        elif skewness < -0.5:
            return "left_skewed"
        else:
            return "unknown"

    def _infer_target_column(self) -> Optional[str]:
        """Infer most likely target column"""
        # Look for common target column patterns
        target_keywords = ['target', 'label', 'outcome', 'churn', 'revenue', 'value', 'price', 'amount']

        for col in self.numeric_cols:
            col_lower = col.lower()
            if any(keyword in col_lower for keyword in target_keywords):
                return col

        # If schema map available, check semantic roles
        if self.schema_map:
            semantic_roles = self.schema_map.get('semantic_roles', {})
            value_like = semantic_roles.get('value_like', [])
            if value_like and value_like[0] in self.numeric_cols:
                return value_like[0]

        return None

    def _find_column_by_role(self, keywords: List[str]) -> Optional[str]:
        """Find column matching any of the keywords"""
        for col in self.df.columns:
            col_lower = col.lower()
            if any(keyword in col_lower for keyword in keywords):
                return col
        return None

    def _compute_gini_coefficient(self, values: pd.Series) -> float:
        """Compute Gini coefficient for inequality measurement"""
        sorted_values = np.sort(values.fillna(0).values)
        n = len(sorted_values)
        cumsum = np.cumsum(sorted_values)
        return float((n + 1 - 2 * np.sum(cumsum) / cumsum[-1]) / n) if cumsum[-1] > 0 else 0.0

    # Insight generation methods

    def _generate_correlation_insights(self, correlations: List[Dict]) -> List[str]:
        """Generate natural language insights from correlations"""
        insights = []

        if not correlations:
            insights.append("No strong correlations detected between features")
            return insights

        insights.append(f"Found {len(correlations)} significant feature relationships")

        # Top correlation
        if correlations:
            top = correlations[0]
            direction = "positive" if top['pearson'] > 0 else "negative"
            insights.append(
                f"Strongest relationship: {top['feature1']} and {top['feature2']} "
                f"({direction}, r={top['pearson']:.2f})"
            )

        # Count strong positive/negative
        positive = sum(1 for c in correlations if c['pearson'] > 0.6)
        negative = sum(1 for c in correlations if c['pearson'] < -0.6)

        if positive > 0:
            insights.append(f"{positive} strong positive correlations indicate features that increase together")
        if negative > 0:
            insights.append(f"{negative} strong negative correlations indicate inverse relationships")

        return insights

    def _generate_distribution_insights(self, distributions: Dict) -> List[str]:
        """Generate insights from distribution analysis"""
        insights = []

        normal_count = sum(1 for d in distributions.values() if d['is_normal'])
        skewed_count = sum(1 for d in distributions.values() if abs(d['skewness']) > 1.0)
        high_outlier_count = sum(1 for d in distributions.values() if d['outlier_percentage'] > 5)

        insights.append(f"Analyzed {len(distributions)} numeric features")

        if normal_count > 0:
            insights.append(f"{normal_count} features follow normal distribution")

        if skewed_count > 0:
            insights.append(f"{skewed_count} features show significant skewness")

        if high_outlier_count > 0:
            insights.append(f"{high_outlier_count} features contain >5% outliers")

        return insights

    def _generate_importance_insights(self, importances: List[Tuple], target: str) -> List[str]:
        """Generate insights from feature importance"""
        insights = []

        if not importances:
            return insights

        top_3 = importances[:3]
        total_top_3 = sum(imp for _, imp in top_3)

        insights.append(f"Top 3 drivers have the strongest relative influence on {target}")

        top_feature, top_imp = importances[0]
        insights.append(f"Most important feature: {top_feature} ({top_imp*100:.1f}% importance)")

        if len(importances) > 5:
            bottom_importance = sum(imp for _, imp in importances[5:])
            insights.append(f"Remaining {len(importances)-5} features contribute {bottom_importance*100:.1f}%")

        return insights

    def _generate_bi_insights(self, metrics: Dict) -> List[str]:
        """Generate business intelligence insights"""
        insights = []

        if 'value_metrics' in metrics:
            vm = metrics['value_metrics']
            insights.append(f"Total value: ${vm['total_value']:,.2f}")

            if vm['value_concentration'] > 0.5:
                insights.append("High value concentration - significant inequality in value distribution")

        if 'segment_value' in metrics:
            top_segment = metrics['segment_value'][0]
            insights.append(
                f"Top segment contributes {top_segment['value_contribution_pct']:.1f}% of total value"
            )

        if 'churn_risk' in metrics:
            cr = metrics['churn_risk']
            if cr['at_risk_percentage'] > 25:
                insights.append(f"Warning: {cr['at_risk_percentage']:.1f}% of records show low activity (churn risk)")

        if "restaurant_risk" in metrics:
            rr = metrics["restaurant_risk"]
            at_risk_pct = rr.get("at_risk_percentage")
            at_risk_count = rr.get("restaurants_at_risk")
            total = rr.get("restaurants_total")
            if at_risk_count is not None and total:
                insights.append(f"{at_risk_count:,} of {total:,} restaurants have critical violations in their most recent inspection")
            elif at_risk_pct is not None:
                insights.append(f"{at_risk_pct:.1f}% of restaurants have critical violations in their most recent inspection")

        if "marketing_risk" in metrics:
            mr = metrics["marketing_risk"]
            total = mr.get("total_entities") or mr.get("total_rows")
            risk_count = mr.get("risk_items")
            if isinstance(risk_count, list) and total:
                insights.append(f"{len(risk_count)} marketing risks flagged across {total:,} records")
            elif isinstance(risk_count, list):
                insights.append(f"{len(risk_count)} marketing risks flagged from available signals")

        return insights

    def _normalize_column_token(self, name: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", str(name).lower())

    def _find_column_by_name(self, candidates: List[str]) -> Optional[str]:
        if not candidates:
            return None
        normalized_map = {self._normalize_column_token(col): col for col in self.df.columns}
        for candidate in candidates:
            key = self._normalize_column_token(candidate)
            if key in normalized_map:
                return normalized_map[key]
        return None

    def _compute_marketing_risk(self) -> Optional[Dict[str, Any]]:
        role_map = {
            "impressions": ["impression", "impressions", "views", "view"],
            "clicks": ["click", "clicks", "tap", "taps"],
            "conversions": ["conversion", "conversions", "purchase", "purchases", "order", "orders", "signup", "signups"],
            "spend": ["spend", "cost", "budget", "adspend", "ad_spend", "media_cost"],
            "revenue": ["revenue", "sales", "value", "gmv", "amount"],
            "campaign": ["campaign", "adgroup", "ad_group", "adgroup_id", "campaign_id"],
            "channel": ["channel", "source", "medium", "platform", "network", "placement"],
            "date": ["date", "timestamp", "time", "hour", "day", "week", "month"],
        }

        impressions_col = self._find_column_by_role(role_map["impressions"])
        clicks_col = self._find_column_by_role(role_map["clicks"])
        conversions_col = self._find_column_by_role(role_map["conversions"])
        spend_col = self._find_column_by_role(role_map["spend"])
        revenue_col = self._find_column_by_role(role_map["revenue"])
        campaign_col = self._find_column_by_role(role_map["campaign"])
        channel_col = self._find_column_by_role(role_map["channel"])
        date_col = self._find_column_by_role(role_map["date"])

        available_metrics: Dict[str, Any] = {}
        evidence_columns: List[str] = []
        for col in [impressions_col, clicks_col, conversions_col, spend_col, revenue_col, campaign_col, channel_col, date_col]:
            if col and col not in evidence_columns:
                evidence_columns.append(col)

        df = self.df.copy()
        if date_col:
            df["_event_time"] = pd.to_datetime(df[date_col], errors="coerce")
            df = df.dropna(subset=["_event_time"])
        else:
            df["_event_time"] = None

        def _to_num(col: Optional[str]) -> Optional[pd.Series]:
            if not col or col not in df.columns:
                return None
            return pd.to_numeric(df[col], errors="coerce")

        impressions = _to_num(impressions_col)
        clicks = _to_num(clicks_col)
        conversions = _to_num(conversions_col)
        spend = _to_num(spend_col)
        revenue = _to_num(revenue_col)

        spend_columns = []
        if spend_col:
            spend_columns = [spend_col]
        else:
            channel_tokens = ("facebook", "youtube", "instagram", "tiktok", "snap", "google", "search", "display", "social", "bing")
            numeric_candidates = []
            for col in self.numeric_cols:
                if col == revenue_col or col == conversions_col or col == clicks_col or col == impressions_col:
                    continue
                if _is_id_column(col):
                    continue
                if date_col and col == date_col:
                    continue
                numeric_candidates.append(col)
            channel_like = [col for col in numeric_candidates if any(tok in col.lower() for tok in channel_tokens)]
            spend_columns = channel_like or numeric_candidates[:5]

        def _safe_divide(numer: pd.Series, denom: pd.Series) -> pd.Series:
            denom = denom.replace(0, np.nan)
            return (numer / denom).replace([np.inf, -np.inf], np.nan).fillna(0)

        spend_total = None
        if spend_columns:
            spend_total = df[spend_columns].apply(pd.to_numeric, errors="coerce").sum(axis=1)
            available_metrics["spend_total"] = safe_float(spend_total.mean())

        if impressions is not None and clicks is not None:
            ctr = _safe_divide(clicks, impressions)
            available_metrics["ctr"] = safe_float(ctr.mean())
        if clicks is not None and conversions is not None:
            cvr = _safe_divide(conversions, clicks)
            available_metrics["cvr"] = safe_float(cvr.mean())
        if spend is not None and revenue is not None:
            roas = _safe_divide(revenue, spend)
            available_metrics["roas"] = safe_float(roas.mean())
        if spend is not None and conversions is not None:
            cac = _safe_divide(spend, conversions)
            available_metrics["cac"] = safe_float(cac.replace(0, np.nan).mean())
        if spend_total is not None and revenue is not None:
            roas = _safe_divide(revenue, spend_total)
            available_metrics["roas"] = safe_float(roas.mean())
        if spend_total is not None and conversions is not None:
            cac = _safe_divide(spend_total, conversions)
            available_metrics["cac"] = safe_float(cac.replace(0, np.nan).mean())

        if not available_metrics:
            return None

        def _split_by_time(frame: pd.DataFrame) -> Optional[Tuple[pd.DataFrame, pd.DataFrame]]:
            if "_event_time" not in frame.columns or frame["_event_time"].isna().all():
                return None
            sorted_frame = frame.sort_values("_event_time")
            cutoff_index = int(len(sorted_frame) * 0.7)
            cutoff_index = max(cutoff_index, 1)
            prior = sorted_frame.iloc[:cutoff_index]
            recent = sorted_frame.iloc[cutoff_index:]
            if prior.empty or recent.empty:
                return None
            return prior, recent

        def _metric_change(numer_col: Optional[str], denom_col: Optional[str]) -> Optional[Dict[str, Any]]:
            if numer_col is None or denom_col is None:
                return None
            numer = pd.to_numeric(df[numer_col], errors="coerce")
            denom = pd.to_numeric(df[denom_col], errors="coerce")
            rate = _safe_divide(numer, denom)
            split = _split_by_time(df)
            if not split:
                return None
            prior_frame, recent_frame = split
            prior_rate = _safe_divide(
                pd.to_numeric(prior_frame[numer_col], errors="coerce"),
                pd.to_numeric(prior_frame[denom_col], errors="coerce"),
            ).mean()
            recent_rate = _safe_divide(
                pd.to_numeric(recent_frame[numer_col], errors="coerce"),
                pd.to_numeric(recent_frame[denom_col], errors="coerce"),
            ).mean()
            if prior_rate == 0 or np.isnan(prior_rate):
                return None
            delta_pct = float((recent_rate - prior_rate) / prior_rate * 100)
            return {
                "prior": safe_float(prior_rate),
                "recent": safe_float(recent_rate),
                "delta_pct": safe_float(delta_pct),
            }

        risk_items: List[Dict[str, Any]] = []

        if date_col and impressions_col and clicks_col:
            change = _metric_change(clicks_col, impressions_col)
            if change and change["delta_pct"] <= -15:
                risk_items.append(
                    {
                        "type": "ctr_decline",
                        "severity": "high" if change["delta_pct"] <= -30 else "medium",
                        "metric": "CTR",
                        "prior": change["prior"],
                        "recent": change["recent"],
                        "delta_pct": change["delta_pct"],
                        "evidence_columns": [clicks_col, impressions_col, date_col],
                    }
                )

        if date_col and clicks_col and conversions_col:
            change = _metric_change(conversions_col, clicks_col)
            if change and change["delta_pct"] <= -15:
                risk_items.append(
                    {
                        "type": "cvr_decline",
                        "severity": "high" if change["delta_pct"] <= -30 else "medium",
                        "metric": "CVR",
                        "prior": change["prior"],
                        "recent": change["recent"],
                        "delta_pct": change["delta_pct"],
                        "evidence_columns": [conversions_col, clicks_col, date_col],
                    }
                )

        if date_col and spend_col and revenue_col:
            change = _metric_change(revenue_col, spend_col)
            if change and change["delta_pct"] <= -20:
                risk_items.append(
                    {
                        "type": "roas_decline",
                        "severity": "high" if change["delta_pct"] <= -35 else "medium",
                        "metric": "ROAS",
                        "prior": change["prior"],
                        "recent": change["recent"],
                        "delta_pct": change["delta_pct"],
                        "evidence_columns": [revenue_col, spend_col, date_col],
                    }
                )

        if date_col and spend_col and conversions_col:
            change = _metric_change(spend_col, conversions_col)
            if change and change["delta_pct"] >= 20:
                risk_items.append(
                    {
                        "type": "cac_spike",
                        "severity": "high" if change["delta_pct"] >= 40 else "medium",
                        "metric": "CAC",
                        "prior": change["prior"],
                        "recent": change["recent"],
                        "delta_pct": change["delta_pct"],
                        "evidence_columns": [spend_col, conversions_col, date_col],
                    }
                )

        segment_col = campaign_col or channel_col
        if segment_col and impressions is not None and clicks is not None:
            grouped = df.groupby(segment_col, dropna=False)
            clicks_sum = pd.to_numeric(grouped[clicks_col].sum(), errors="coerce")
            impressions_sum = pd.to_numeric(grouped[impressions_col].sum(), errors="coerce")
            group_rates = _safe_divide(clicks_sum, impressions_sum)
            if not group_rates.empty:
                worst_segments = group_rates.sort_values().head(5)
                risk_items.append(
                    {
                        "type": "segment_ctr_underperform",
                        "severity": "medium",
                        "metric": "CTR",
                        "segments": [
                            {"segment": str(idx), "value": safe_float(val)} for idx, val in worst_segments.items()
                        ],
                        "evidence_columns": [segment_col, clicks_col, impressions_col],
                    }
                )

        if segment_col and spend is not None and revenue is not None:
            grouped = df.groupby(segment_col, dropna=False)
            revenue_sum = pd.to_numeric(grouped[revenue_col].sum(), errors="coerce")
            spend_sum = pd.to_numeric(grouped[spend_col].sum(), errors="coerce")
            group_roas = _safe_divide(revenue_sum, spend_sum)
            if not group_roas.empty:
                worst_segments = group_roas.sort_values().head(5)
                risk_items.append(
                    {
                        "type": "segment_roas_underperform",
                        "severity": "medium",
                        "metric": "ROAS",
                        "segments": [
                            {"segment": str(idx), "value": safe_float(val)} for idx, val in worst_segments.items()
                        ],
                        "evidence_columns": [segment_col, revenue_col, spend_col],
                    }
                )

        if spend_columns and revenue_col:
            spend_frame = df[spend_columns].apply(pd.to_numeric, errors="coerce")
            spend_share = spend_frame.sum(axis=0)
            spend_total_sum = spend_share.sum()
            if spend_total_sum > 0:
                spend_share = (spend_share / spend_total_sum).sort_values(ascending=False)
                top_col = spend_share.index[0]
                if spend_share.iloc[0] >= 0.6:
                    risk_items.append(
                        {
                            "type": "channel_spend_concentration",
                            "severity": "medium",
                            "metric": "Spend Concentration",
                            "segments": [
                                {"segment": str(col), "value": safe_float(val)} for col, val in spend_share.head(3).items()
                            ],
                            "evidence_columns": list(spend_columns),
                        }
                    )
                for col in spend_columns[:5]:
                    try:
                        corr = df[[col, revenue_col]].corr().iloc[0, 1]
                    except Exception:
                        corr = None
                    if corr is not None and corr < -0.2:
                        risk_items.append(
                            {
                                "type": "negative_channel_correlation",
                                "severity": "medium",
                                "metric": "Revenue vs Spend",
                                "segments": [
                                    {"segment": str(col), "value": safe_float(corr)}
                                ],
                                "evidence_columns": [col, revenue_col],
                            }
                        )

        missing_signals = []
        if not impressions_col or not clicks_col:
            missing_signals.append("ctr")
        if not conversions_col or not clicks_col:
            missing_signals.append("cvr")
        if not revenue_col or (not spend_col and not spend_columns):
            missing_signals.append("roas")
        if (not spend_col and not spend_columns) or not conversions_col:
            missing_signals.append("cac")

        return {
            "available": True,
            "definition": "Marketing risk is flagged when performance ratios (CTR/CVR/ROAS/CAC) decline materially in the most recent period or when segments underperform.",
            "metrics": available_metrics,
            "risk_items": risk_items,
            "segment_dimension": segment_col,
            "time_dimension": date_col,
            "missing_signals": missing_signals,
            "total_rows": int(len(df)),
            "evidence_columns": evidence_columns + spend_columns,
        }

    def _compute_marketing_simulation(self) -> Optional[Dict[str, Any]]:
        role_map = {
            "impressions": ["impression", "impressions", "views", "view"],
            "clicks": ["click", "clicks", "tap", "taps"],
            "conversions": ["conversion", "conversions", "purchase", "purchases", "order", "orders", "signup", "signups"],
            "spend": ["spend", "cost", "budget", "adspend", "ad_spend", "media_cost"],
            "revenue": ["revenue", "sales", "value", "gmv", "amount"],
        }

        impressions_col = self._find_column_by_role(role_map["impressions"])
        clicks_col = self._find_column_by_role(role_map["clicks"])
        conversions_col = self._find_column_by_role(role_map["conversions"])
        spend_col = self._find_column_by_role(role_map["spend"])
        revenue_col = self._find_column_by_role(role_map["revenue"])

        def _total(col: Optional[str]) -> Optional[float]:
            if not col or col not in self.df.columns:
                return None
            series = pd.to_numeric(self.df[col], errors="coerce").fillna(0)
            return float(series.sum())

        impressions_total = _total(impressions_col)
        clicks_total = _total(clicks_col)
        conversions_total = _total(conversions_col)
        spend_total = _total(spend_col)
        revenue_total = _total(revenue_col)

        if all(value is None for value in [impressions_total, clicks_total, conversions_total, spend_total, revenue_total]):
            return None

        def _safe_ratio(numer: Optional[float], denom: Optional[float]) -> Optional[float]:
            if numer is None or denom is None or denom == 0:
                return None
            return float(numer / denom)

        baseline = {
            "impressions_total": safe_float(impressions_total) if impressions_total is not None else None,
            "clicks_total": safe_float(clicks_total) if clicks_total is not None else None,
            "conversions_total": safe_float(conversions_total) if conversions_total is not None else None,
            "spend_total": safe_float(spend_total) if spend_total is not None else None,
            "revenue_total": safe_float(revenue_total) if revenue_total is not None else None,
            "ctr": safe_float(_safe_ratio(clicks_total, impressions_total)) if clicks_total is not None and impressions_total is not None else None,
            "cvr": safe_float(_safe_ratio(conversions_total, clicks_total)) if conversions_total is not None and clicks_total is not None else None,
            "roas": safe_float(_safe_ratio(revenue_total, spend_total)) if revenue_total is not None and spend_total is not None else None,
            "cac": safe_float(_safe_ratio(spend_total, conversions_total)) if spend_total is not None and conversions_total is not None else None,
        }

        scenarios = []

        if conversions_total is not None and spend_total is not None and conversions_total > 0:
            new_conversions = conversions_total * 1.05
            scenario_metrics = {
                "conversions_total": safe_float(new_conversions),
                "cvr": safe_float(_safe_ratio(new_conversions, clicks_total)) if clicks_total is not None else None,
                "cac": safe_float(_safe_ratio(spend_total, new_conversions)),
            }
            if revenue_total is not None and conversions_total > 0:
                revenue_per_conversion = revenue_total / conversions_total
                scenario_revenue = revenue_per_conversion * new_conversions
                scenario_metrics["revenue_total"] = safe_float(scenario_revenue)
                scenario_metrics["roas"] = safe_float(_safe_ratio(scenario_revenue, spend_total))
            scenarios.append(
                {
                    "name": "Increase conversions by 5%",
                    "assumptions": [
                        "Spend held constant",
                        "Revenue per conversion held constant (if revenue available)",
                    ],
                    "metrics": scenario_metrics,
                }
            )

        if spend_total is not None:
            reduced_spend = spend_total * 0.9
            scenario_metrics = {
                "spend_total": safe_float(reduced_spend),
                "cac": safe_float(_safe_ratio(reduced_spend, conversions_total)) if conversions_total is not None else None,
                "roas": safe_float(_safe_ratio(revenue_total, reduced_spend)) if revenue_total is not None else None,
            }
            scenarios.append(
                {
                    "name": "Reduce spend by 10%",
                    "assumptions": [
                        "Conversions held constant",
                        "Revenue held constant (if revenue available)",
                    ],
                    "metrics": scenario_metrics,
                }
            )

        if not scenarios:
            return None

        evidence_columns = [col for col in [impressions_col, clicks_col, conversions_col, spend_col, revenue_col] if col]

        return {
            "available": True,
            "baseline": baseline,
            "scenarios": scenarios,
            "evidence_columns": evidence_columns,
        }

    def _compute_restaurant_risk(self) -> Optional[Dict[str, Any]]:
        id_col = self._find_column_by_name(["CAMIS", "restaurant_id"])
        date_col = self._find_column_by_name(["INSPECTION DATE", "inspection_date"])
        critical_col = self._find_column_by_name(["CRITICAL FLAG", "critical_flag", "critical"])

        if not id_col or not date_col or not critical_col:
            return None

        df = self.df.copy()
        df["_inspection_date"] = pd.to_datetime(df[date_col], errors="coerce")
        df = df.dropna(subset=[id_col, "_inspection_date"])
        if df.empty:
            return None

        latest_dates = df.groupby(id_col)["_inspection_date"].max()
        df_latest = df.merge(latest_dates.rename("_latest_date"), left_on=id_col, right_index=True)
        df_latest = df_latest[df_latest["_inspection_date"] == df_latest["_latest_date"]]

        if df_latest.empty:
            return None

        df_latest["_is_critical"] = df_latest[critical_col].astype(str).str.strip().str.upper().eq("Y")

        name_col = self._find_column_by_name(["DBA", "restaurant_name"])
        boro_col = self._find_column_by_name(["BORO", "borough"])
        cuisine_col = self._find_column_by_name(["CUISINE DESCRIPTION", "cuisine", "cuisine_description"])
        score_col = self._find_column_by_name(["SCORE", "score"])
        grade_col = self._find_column_by_name(["GRADE", "grade"])
        building_col = self._find_column_by_name(["BUILDING", "building"])
        street_col = self._find_column_by_name(["STREET", "street"])
        zipcode_col = self._find_column_by_name(["ZIPCODE", "zip", "zip_code"])

        def _clean(value: Any) -> str:
            if value is None or (isinstance(value, float) and math.isnan(value)):
                return ""
            return str(value).strip()

        restaurants = []
        for camis, group in df_latest.groupby(id_col):
            critical_count = int(group["_is_critical"].sum())
            if critical_count <= 0:
                continue
            last_date = group["_inspection_date"].max()
            score_val = None
            if score_col and score_col in group.columns:
                scores = pd.to_numeric(group[score_col], errors="coerce")
                if scores.notna().any():
                    score_val = float(scores.max())
            grade_val = None
            if grade_col and grade_col in group.columns:
                grade_series = group[grade_col].dropna()
                if not grade_series.empty:
                    grade_val = str(grade_series.iloc[0])
            name_val = _clean(group[name_col].iloc[0]) if name_col else ""
            boro_val = _clean(group[boro_col].iloc[0]) if boro_col else ""
            cuisine_val = _clean(group[cuisine_col].iloc[0]) if cuisine_col else ""
            building_val = _clean(group[building_col].iloc[0]) if building_col else ""
            street_val = _clean(group[street_col].iloc[0]) if street_col else ""
            zipcode_val = _clean(group[zipcode_col].iloc[0]) if zipcode_col else ""
            address_parts = [part for part in [building_val, street_val] if part]
            address = " ".join(address_parts).strip()
            if zipcode_val:
                address = f"{address}, {zipcode_val}" if address else zipcode_val

            restaurants.append(
                {
                    "restaurant_id": str(camis),
                    "name": name_val,
                    "boro": boro_val,
                    "cuisine": cuisine_val,
                    "address": address,
                    "last_inspection_date": last_date.isoformat(),
                    "critical_count": critical_count,
                    "score": score_val,
                    "grade": grade_val,
                }
            )

        total_restaurants = int(df_latest[id_col].nunique())
        at_risk_count = len(restaurants)
        if at_risk_count == 0:
            return None

        restaurants.sort(
            key=lambda entry: (
                entry.get("critical_count", 0),
                entry.get("score") if entry.get("score") is not None else -1,
                entry.get("last_inspection_date", ""),
            ),
            reverse=True,
        )

        def _aggregate_group(column: Optional[str], label: str) -> List[Dict[str, Any]]:
            if not column:
                return []
            summary = []
            grouped = df_latest.groupby(column)
            for key, group in grouped:
                key_label = _clean(key) or "Unknown"
                total = int(group[id_col].nunique())
                at_risk = int(group[group["_is_critical"]].groupby(id_col).ngroups)
                if total == 0:
                    continue
                summary.append(
                    {
                        label: key_label,
                        "total_restaurants": total,
                        "at_risk_count": at_risk,
                        "at_risk_percentage": safe_float(at_risk / total * 100),
                    }
                )
            summary.sort(key=lambda item: (item["at_risk_count"], item["at_risk_percentage"]), reverse=True)
            return summary[:10]

        risk_by_boro = _aggregate_group(boro_col, "boro")
        risk_by_cuisine = _aggregate_group(cuisine_col, "cuisine")

        return {
            "available": True,
            "definition": "Most recent inspection includes at least one CRITICAL FLAG = 'Y' violation.",
            "restaurant_id_column": id_col,
            "inspection_date_column": date_col,
            "critical_flag_column": critical_col,
            "restaurants_total": total_restaurants,
            "restaurants_at_risk": at_risk_count,
            "at_risk_percentage": safe_float(at_risk_count / total_restaurants * 100),
            "as_of": df_latest["_inspection_date"].max().isoformat(),
            "top_risk_restaurants": restaurants[:20],
            "risk_by_boro": risk_by_boro,
            "risk_by_cuisine": risk_by_cuisine,
            "evidence_columns": [col for col in [id_col, date_col, critical_col, name_col, boro_col, cuisine_col] if col],
        }

    def _generate_quality_insights(self, completeness: Dict, consistency: Dict) -> List[str]:
        """Generate data quality insights"""
        insights = []

        incomplete_cols = [col for col, pct in completeness.items() if pct < 95]
        if incomplete_cols:
            insights.append(f"{len(incomplete_cols)} columns have <95% completeness")

        if consistency:
            inconsistent = [col for col, score in consistency.items()
                          if not score.get('is_consistent', True)]
            if inconsistent:
                insights.append(f"{len(inconsistent)} features show high variability")

        return insights


def run_enhanced_analytics(
    df: pd.DataFrame,
    schema_map: Optional[Dict] = None,
    cluster_labels: Optional[np.ndarray] = None,
    state_manager: Optional["StateManager"] = None,
) -> Dict[str, Any]:
    """
    Run complete enhanced analytics suite with quality-based fail-safe mode.
    
    STABILITY LAW 3: Evidence Logic
    If data quality < 0.5, only descriptive analytics are run to prevent hallucinations.
    Feature importance and predictive analysis are disabled in fail-safe mode.

    Args:
        df: Input dataframe
        schema_map: Optional schema mapping
        cluster_labels: Optional cluster assignments
        state_manager: Optional state manager for evidence persistence

    Returns:
        Comprehensive analytics results with mode indicator
    """
    analytics = EnhancedAnalytics(df, schema_map, state_manager=state_manager)
    
    # Determine analysis mode based on data quality
    quality_score = 1.0  # Default to high quality
    if state_manager:
        try:
            identity_card = state_manager.read("dataset_identity_card")
            if identity_card:
                quality_score = identity_card.get("quality_score", 1.0)
        except Exception:
            pass  # Safe to proceed with default
    
    # FAIL-SAFE MODE GATE
    analysis_mode = get_analysis_mode(quality_score)
    enable_predictive = should_enable_predictive_mode(quality_score)
    
    print(f"[ENHANCED_ANALYTICS] Quality Score: {quality_score:.2f}")
    print(f"[ENHANCED_ANALYTICS] Analysis Mode: {analysis_mode.upper()}")
    
    results = {
        "analysis_mode": analysis_mode,
        "quality_score": quality_score,
        "quality_threshold": QUALITY_THRESHOLD,
        "predictive_enabled": enable_predictive,
    }
    
    def _record_validation(name: str, validation: Dict[str, Any]) -> None:
        if state_manager is None:
            return
        existing = state_manager.read("analytics_validation")
        if not isinstance(existing, dict):
            existing = {}
        existing[name] = validation
        state_manager.write("analytics_validation", existing)
        for warning in validation.get("warnings", []):
            warning_type = warning.get("type")
            if not warning_type:
                continue
            message = warning.get("note") or f"{warning_type}: {warning.get('metric')}"
            state_manager.add_warning(warning_type, message, details=warning)

    def _apply_validation(name: str, payload: Dict[str, Any], validator) -> Optional[Dict[str, Any]]:
        if not payload or payload.get("available") is False:
            _record_validation(
                name,
                {
                    "valid": False,
                    "errors": [
                        {
                            "type": "ARTIFACT_UNAVAILABLE",
                            "metric": name,
                            "value": None,
                            "allowed_range": "computed",
                            "path": None,
                        }
                    ],
                    "warnings": [],
                },
            )
            return None
        validation = validator(payload)
        payload = dict(payload)
        payload["valid"] = validation["valid"]
        payload["errors"] = validation["errors"]
        payload["warnings"] = validation["warnings"]
        payload["status"] = "success" if validation["valid"] else "failed"
        _record_validation(name, validation)
        return payload if validation["valid"] else None

    def _attach_available(name: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not payload or payload.get("available") is False:
            _record_validation(
                name,
                {
                    "valid": False,
                    "errors": [
                        {
                            "type": "ARTIFACT_UNAVAILABLE",
                            "metric": name,
                            "value": None,
                            "allowed_range": "computed",
                            "path": None,
                        }
                    ],
                    "warnings": [],
                },
            )
            return None
        payload = dict(payload)
        payload["valid"] = True
        payload["errors"] = []
        payload["warnings"] = []
        payload["status"] = "success"
        _record_validation(name, {"valid": True, "errors": [], "warnings": []})
        return payload

    # Always run descriptive analytics
    results["correlation_analysis"] = _apply_validation(
        "correlation_analysis",
        analytics.compute_correlation_matrix(),
        validate_correlation_analysis,
    )
    correlation_ci_payload = None
    if isinstance(results.get("correlation_analysis"), dict):
        correlation_ci_payload = results["correlation_analysis"].get("correlation_ci")
    if correlation_ci_payload:
        results["correlation_ci"] = _apply_validation(
            "correlation_ci",
            {"available": True, "pairs": correlation_ci_payload},
            validate_correlation_ci,
        )
    else:
        results["correlation_ci"] = None
    results["distribution_analysis"] = _attach_available("distribution_analysis", analytics.analyze_distributions())
    results["quality_metrics"] = _attach_available("quality_metrics", analytics.compute_advanced_quality_metrics())
    results["redundancy_report"] = _apply_validation(
        "redundancy_report",
        analytics.compute_redundancy_report(),
        validate_redundancy_report,
    )
    results["business_intelligence"] = _attach_available("business_intelligence", analytics.compute_business_intelligence(cluster_labels))
    
    # Only run predictive analytics if quality threshold met
    if enable_predictive:
        print("[ENHANCED_ANALYTICS] OK: Quality threshold met - enabling feature importance")
        results["feature_importance"] = _apply_validation(
            "feature_importance",
            analytics.compute_feature_importance(),
            validate_feature_importance,
        )
    else:
        print(f"[ENHANCED_ANALYTICS] WARN: Quality < {QUALITY_THRESHOLD} - skipping predictive analysis (fail-safe mode)")
        results["feature_importance"] = None
    
    return results
