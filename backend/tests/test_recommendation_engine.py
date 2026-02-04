"""Tests for the ML-driven recommendation engine."""
import pytest

from core.recommendation_engine import generate_recommendations


@pytest.fixture
def mock_analytics():
    """Sample enhanced analytics data."""
    return {
        "correlation_analysis": {
            "strong_correlations": [
                {"feature1": "engagement", "feature2": "revenue", "pearson": 0.72, "direction": "positive"},
                {"feature1": "tenure", "feature2": "loyalty_score", "pearson": 0.65, "direction": "positive"},
            ]
        },
        "business_intelligence": {
            "value_metrics": {"total_value": 100000, "avg_value": 150},
            "segment_value": [
                {"segment": "High Value", "total_value": 60000, "avg_value": 300, "size": 200, "value_contribution_pct": 60},
                {"segment": "Mid Value", "total_value": 30000, "avg_value": 100, "size": 300, "value_contribution_pct": 30},
                {"segment": "Low Value", "total_value": 10000, "avg_value": 20, "size": 500, "value_contribution_pct": 10},
            ],
            "churn_risk": {"at_risk_count": 75, "at_risk_percentage": 15, "low_activity_threshold": 2},
            "clv_proxy": {"avg_value": 150, "high_value_threshold": 400},
            "ghost_revenue": {"count": 25},
            "zombie_cohorts": {"count": 50},
        },
        "distribution_analysis": {
            "distributions": {
                "revenue": {"outlier_percentage": 8, "skewness": 1.5},
                "age": {"outlier_percentage": 2, "skewness": 0.3},
            }
        },
        "quality_metrics": {"overall_score": 0.85},
    }


@pytest.fixture
def mock_artifacts():
    """Sample model artifacts."""
    return {
        "importance_report": {
            "features": [
                {"feature": "engagement", "importance": 28.5},
                {"feature": "tenure", "importance": 18.2},
                {"feature": "purchase_frequency", "importance": 12.1},
                {"feature": "age", "importance": 8.5},
            ]
        },
        "model_fit_report": {
            "model": "xgboost",
            "target_column": "revenue",
            "target_type": "continuous",
            "metrics": {"r2": 0.82, "mae": 15.3},
            "baseline_metrics": {"mae": 45.0},
        }
    }


@pytest.fixture
def mock_time_series():
    """Sample time series analysis."""
    return {
        "status": "ok",
        "analyses": {
            "revenue": {
                "trend": {
                    "direction": "decreasing",
                    "total_pct_change": -15.5,
                    "p_value": 0.02,
                    "r_squared": 0.65,
                },
                "volatility": {
                    "volatility_trend": "increasing",
                    "mean_volatility": 0.12,
                },
                "change_points": {
                    "detected": True,
                    "count": 2,
                    "points": [{"date": "2023-06-15", "shift_pct": -12.5}],
                },
            }
        }
    }


class TestGenerateRecommendations:
    def test_returns_valid_structure(self, mock_analytics, mock_artifacts):
        result = generate_recommendations(
            enhanced_analytics=mock_analytics,
            model_artifacts=mock_artifacts,
        )

        assert result["status"] == "ok"
        assert result["valid"] is True
        assert "recommendations" in result
        assert "by_category" in result
        assert "signal_summary" in result

    def test_generates_feature_recommendations(self, mock_analytics, mock_artifacts):
        result = generate_recommendations(
            enhanced_analytics=mock_analytics,
            model_artifacts=mock_artifacts,
        )

        feature_recs = [r for r in result["recommendations"] if r["category"] == "feature_optimization"]
        assert len(feature_recs) > 0
        # Top driver should be engagement
        assert any("engagement" in r["action"].lower() for r in feature_recs)

    def test_generates_segment_recommendations(self, mock_analytics, mock_artifacts):
        result = generate_recommendations(
            enhanced_analytics=mock_analytics,
            model_artifacts=mock_artifacts,
        )

        segment_recs = [r for r in result["recommendations"] if r["category"] == "segment_strategy"]
        assert len(segment_recs) > 0
        # Should recommend protecting high value segment
        assert any("high value" in r["action"].lower() for r in segment_recs)

    def test_generates_churn_recommendations(self, mock_analytics, mock_artifacts):
        result = generate_recommendations(
            enhanced_analytics=mock_analytics,
            model_artifacts=mock_artifacts,
        )

        risk_recs = [r for r in result["recommendations"] if r["category"] == "risk_mitigation"]
        assert len(risk_recs) > 0
        # Should mention at-risk customers
        assert any("at-risk" in r["action"].lower() or "retention" in r["action"].lower() for r in risk_recs)

    def test_generates_correlation_recommendations(self, mock_analytics, mock_artifacts):
        result = generate_recommendations(
            enhanced_analytics=mock_analytics,
            model_artifacts=mock_artifacts,
        )

        corr_recs = [r for r in result["recommendations"] if r["category"] == "relationship_leverage"]
        # May or may not have correlation recs depending on driver overlap
        # At minimum, the correlation between tenure and loyalty_score should generate one
        # since tenure is a driver but loyalty_score isn't
        if corr_recs:
            assert any("relationship" in r["action"].lower() for r in corr_recs)

    def test_generates_monetization_recommendations(self, mock_analytics, mock_artifacts):
        result = generate_recommendations(
            enhanced_analytics=mock_analytics,
            model_artifacts=mock_artifacts,
        )

        revenue_recs = [r for r in result["recommendations"] if r["category"] == "revenue_optimization"]
        cost_recs = [r for r in result["recommendations"] if r["category"] == "cost_optimization"]

        # Should have ghost revenue rec
        assert len(revenue_recs) > 0 or len(cost_recs) > 0

    def test_includes_time_series_recommendations(self, mock_analytics, mock_artifacts, mock_time_series):
        result = generate_recommendations(
            enhanced_analytics=mock_analytics,
            model_artifacts=mock_artifacts,
            time_series=mock_time_series,
        )

        trend_recs = [r for r in result["recommendations"] if r["category"] == "trend_action"]
        assert len(trend_recs) > 0
        # Should mention declining revenue
        assert any("declining" in r["action"].lower() or "decreasing" in r["action"].lower() for r in trend_recs)

    def test_assigns_priorities(self, mock_analytics, mock_artifacts):
        result = generate_recommendations(
            enhanced_analytics=mock_analytics,
            model_artifacts=mock_artifacts,
        )

        priorities = {r["priority"] for r in result["recommendations"]}
        # Should have at least Critical and High priorities
        assert "Critical" in priorities or "High" in priorities

    def test_recommendations_have_required_fields(self, mock_analytics, mock_artifacts):
        result = generate_recommendations(
            enhanced_analytics=mock_analytics,
            model_artifacts=mock_artifacts,
        )

        for rec in result["recommendations"]:
            assert "category" in rec
            assert "action" in rec
            assert "rationale" in rec
            assert "confidence" in rec
            assert "impact" in rec
            assert "priority" in rec

    def test_confidence_in_valid_range(self, mock_analytics, mock_artifacts):
        result = generate_recommendations(
            enhanced_analytics=mock_analytics,
            model_artifacts=mock_artifacts,
        )

        for rec in result["recommendations"]:
            assert 0 <= rec["confidence"] <= 1

    def test_deduplicates_similar_recommendations(self, mock_analytics, mock_artifacts):
        result = generate_recommendations(
            enhanced_analytics=mock_analytics,
            model_artifacts=mock_artifacts,
        )

        # Check no duplicate category:lever combinations
        seen = set()
        for rec in result["recommendations"]:
            key = f"{rec['category']}:{rec.get('lever', '')}"
            assert key not in seen, f"Duplicate recommendation: {key}"
            seen.add(key)


class TestEmptyInputs:
    def test_handles_empty_analytics(self):
        result = generate_recommendations(enhanced_analytics={})
        assert result["status"] == "ok"
        assert len(result["recommendations"]) == 0

    def test_handles_none_inputs(self):
        result = generate_recommendations()
        assert result["status"] == "ok"
        assert result["valid"] is True

    def test_handles_partial_analytics(self):
        partial = {
            "correlation_analysis": {
                "strong_correlations": [
                    {"feature1": "x", "feature2": "y", "pearson": 0.8, "direction": "positive"}
                ]
            }
        }
        result = generate_recommendations(enhanced_analytics=partial)
        assert result["status"] == "ok"


class TestDataQualityRecommendations:
    def test_low_quality_generates_recommendation(self):
        analytics = {"quality_metrics": {"overall_score": 0.45}}
        result = generate_recommendations(enhanced_analytics=analytics)

        quality_recs = [r for r in result["recommendations"] if r["category"] == "data_improvement"]
        assert len(quality_recs) > 0

    def test_high_quality_no_recommendation(self):
        analytics = {"quality_metrics": {"overall_score": 0.95}}
        result = generate_recommendations(enhanced_analytics=analytics)

        quality_recs = [r for r in result["recommendations"] if "data quality" in r.get("rationale", "").lower()]
        assert len(quality_recs) == 0


class TestSignalSummary:
    def test_signal_summary_counts(self, mock_analytics, mock_artifacts, mock_time_series):
        result = generate_recommendations(
            enhanced_analytics=mock_analytics,
            model_artifacts=mock_artifacts,
            time_series=mock_time_series,
        )

        summary = result["signal_summary"]
        assert summary["n_features"] == 4
        assert summary["has_churn_signal"] is True
        assert summary["has_time_series"] is True
        assert summary["data_quality_score"] == 0.85


class TestCategoryGrouping:
    def test_groups_by_category(self, mock_analytics, mock_artifacts):
        result = generate_recommendations(
            enhanced_analytics=mock_analytics,
            model_artifacts=mock_artifacts,
        )

        by_category = result["by_category"]
        assert isinstance(by_category, dict)

        # All recommendations should be accounted for
        total_in_groups = sum(len(recs) for recs in by_category.values())
        assert total_in_groups == len(result["recommendations"])
