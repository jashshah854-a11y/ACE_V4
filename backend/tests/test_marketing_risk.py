import pandas as pd

from core.enhanced_analytics import EnhancedAnalytics


def test_marketing_risk_report_flags_ctr_drop():
    df = pd.DataFrame(
        {
            "date": [
                "2024-01-01",
                "2024-01-02",
                "2024-01-03",
                "2024-01-04",
                "2024-01-05",
                "2024-01-06",
                "2024-01-07",
                "2024-01-08",
                "2024-01-09",
                "2024-01-10",
            ],
            "impressions": [100, 110, 120, 130, 140, 150, 160, 200, 210, 220],
            "clicks": [10, 11, 12, 13, 14, 15, 16, 6, 5, 4],
            "spend": [100, 110, 120, 130, 140, 150, 160, 200, 210, 220],
            "revenue": [400, 420, 440, 460, 480, 500, 520, 300, 280, 260],
            "conversions": [4, 4, 4, 5, 5, 5, 6, 2, 2, 1],
            "channel": ["search", "search", "search", "search", "search", "search", "search", "social", "social", "social"],
        }
    )

    analytics = EnhancedAnalytics(df)
    bi = analytics.compute_business_intelligence()
    mr = bi.get("marketing_risk")

    assert mr is not None
    assert mr.get("available") is True
    assert "ctr" in mr.get("metrics", {})
    assert mr.get("risk_items")


def test_marketing_risk_missing_signals_returns_none():
    df = pd.DataFrame({"user_id": [1, 2, 3], "value": [10, 20, 30]})
    analytics = EnhancedAnalytics(df)
    bi = analytics.compute_business_intelligence()
    assert bi.get("marketing_risk") is None


def test_marketing_risk_with_channel_spend_columns():
    df = pd.DataFrame(
        {
            "youtube": [100, 120, 140],
            "facebook": [80, 60, 40],
            "sales": [300, 320, 310],
        }
    )
    analytics = EnhancedAnalytics(df)
    bi = analytics.compute_business_intelligence()
    mr = bi.get("marketing_risk")
    assert mr is not None
    assert mr.get("available") is True
    assert "roas" in mr.get("metrics", {})
