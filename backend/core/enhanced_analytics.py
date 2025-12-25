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
from typing import Dict, List, Optional, Tuple, Any
from scipy import stats
from scipy.stats import pearsonr, spearmanr, chi2_contingency
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score
import warnings

warnings.filterwarnings('ignore')


class EnhancedAnalytics:
    """Advanced analytics engine for comprehensive data analysis"""

    def __init__(self, df: pd.DataFrame, schema_map: Optional[Dict] = None):
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

        # Find strong correlations
        strong_correlations = []
        for i in range(len(pearson_corr.columns)):
            for j in range(i + 1, len(pearson_corr.columns)):
                col1, col2 = pearson_corr.columns[i], pearson_corr.columns[j]
                pearson_val = pearson_corr.iloc[i, j]
                spearman_val = spearman_corr.iloc[i, j]

                # Consider correlation strong if |r| > 0.5
                if abs(pearson_val) > 0.5 or abs(spearman_val) > 0.5:
                    strong_correlations.append({
                        "feature1": col1,
                        "feature2": col2,
                        "pearson": float(pearson_val),
                        "spearman": float(spearman_val),
                        "strength": self._correlation_strength(max(abs(pearson_val), abs(spearman_val))),
                        "direction": "positive" if pearson_val > 0 else "negative"
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
            "insights": self._generate_correlation_insights(strong_correlations)
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

    def compute_feature_importance(self, target_col: Optional[str] = None) -> Dict[str, Any]:
        """
        Compute feature importance using Random Forest

        Args:
            target_col: Target column for supervised importance. If None, attempts to infer.

        Returns:
            Feature importance rankings
        """
        if len(self.numeric_cols) < 2:
            return {"available": False, "reason": "Insufficient features"}

        # Auto-detect target if not provided
        if target_col is None:
            target_col = self._infer_target_column()

        if target_col is None or target_col not in self.df.columns:
            return {"available": False, "reason": "No valid target column"}

        # Prepare features and target
        feature_cols = [col for col in self.numeric_cols if col != target_col]
        X = self.df[feature_cols].fillna(self.df[feature_cols].mean())
        y = self.df[target_col].fillna(self.df[target_col].mean())

        if len(X) < 10:
            return {"available": False, "reason": "Insufficient samples"}

        # Determine task type
        is_regression = len(y.unique()) > 10

        try:
            if is_regression:
                model = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=10)
            else:
                model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)

            model.fit(X, y)

            # Get feature importance
            importances = model.feature_importances_
            feature_importance = sorted(
                zip(feature_cols, importances),
                key=lambda x: x[1],
                reverse=True
            )

            # Cross-validation score
            cv_scores = cross_val_score(model, X, y, cv=min(5, len(X) // 2), scoring='r2' if is_regression else 'accuracy')

            return {
                "available": True,
                "target": target_col,
                "task_type": "regression" if is_regression else "classification",
                "feature_importance": [
                    {"feature": feat, "importance": float(imp), "rank": idx + 1}
                    for idx, (feat, imp) in enumerate(feature_importance)
                ],
                "cv_score_mean": float(cv_scores.mean()),
                "cv_score_std": float(cv_scores.std()),
                "top_features": [feat for feat, _ in feature_importance[:5]],
                "insights": self._generate_importance_insights(feature_importance, target_col)
            }
        except Exception as e:
            return {"available": False, "reason": f"Model training failed: {str(e)}"}

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
        value_col = self._find_column_by_role(['revenue', 'value', 'amount', 'sales', 'total'])
        time_col = self._find_column_by_role(['date', 'time', 'timestamp', 'created', 'month'])

        if value_col:
            values = self.df[value_col].fillna(0)
            metrics["evidence"]["value_column"] = value_col

            metrics['value_metrics'] = {
                "total_value": float(values.sum()),
                "avg_value": float(values.mean()),
                "median_value": float(values.median()),
                "top_10_percent_value": float(values.quantile(0.9)),
                "value_concentration": self._compute_gini_coefficient(values)
            }

            # Customer Lifetime Value proxy
            if len(self.df) > 0:
                avg_value_per_record = values.mean()
                record_count = len(self.df)

                metrics['clv_proxy'] = {
                    "avg_value_per_record": float(avg_value_per_record),
                    "estimated_total_value": float(avg_value_per_record * record_count),
                    "high_value_threshold": float(values.quantile(0.75)),
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
            activity = self.df[activity_col].fillna(0)

            # Low activity as churn risk
            low_activity_threshold = activity.quantile(0.25)
            at_risk_count = int((activity <= low_activity_threshold).sum())

            metrics['churn_risk'] = {
                "at_risk_count": at_risk_count,
                "at_risk_percentage": float(at_risk_count / len(self.df) * 100),
                "avg_activity": float(activity.mean()),
                "low_activity_threshold": float(low_activity_threshold),
                "activity_column": activity_col
            }
            metrics["evidence"]["churn_activity_column"] = activity_col

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
        if abs_val >= 0.8:
            return "very_strong"
        elif abs_val >= 0.6:
            return "strong"
        elif abs_val >= 0.4:
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

        insights.append(f"Top 3 features explain {total_top_3*100:.1f}% of {target} variance")

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

        return insights

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


def run_enhanced_analytics(df: pd.DataFrame, schema_map: Optional[Dict] = None,
                          cluster_labels: Optional[np.ndarray] = None) -> Dict[str, Any]:
    """
    Run complete enhanced analytics suite

    Args:
        df: Input dataframe
        schema_map: Optional schema mapping
        cluster_labels: Optional cluster assignments

    Returns:
        Comprehensive analytics results
    """
    analytics = EnhancedAnalytics(df, schema_map)

    return {
        "correlation_analysis": analytics.compute_correlation_matrix(),
        "distribution_analysis": analytics.analyze_distributions(),
        "feature_importance": analytics.compute_feature_importance(),
        "business_intelligence": analytics.compute_business_intelligence(cluster_labels),
        "quality_metrics": analytics.compute_advanced_quality_metrics()
    }
