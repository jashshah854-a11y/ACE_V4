import pandas as pd

from core.enhanced_analytics import EnhancedAnalytics


def test_restaurant_risk_report():
    df = pd.DataFrame(
        {
            "CAMIS": ["A", "A", "B", "B"],
            "DBA": ["Alpha", "Alpha", "Bravo", "Bravo"],
            "BORO": ["Manhattan", "Manhattan", "Queens", "Queens"],
            "CUISINE DESCRIPTION": ["Deli", "Deli", "Pizza", "Pizza"],
            "INSPECTION DATE": ["2024-01-01", "2024-06-01", "2024-02-01", "2024-07-01"],
            "CRITICAL FLAG": ["N", "Y", "N", "N"],
            "SCORE": [10, 20, 12, 14],
            "GRADE": ["A", "B", "A", "A"],
        }
    )

    analytics = EnhancedAnalytics(df)
    bi = analytics.compute_business_intelligence()
    rr = bi.get("restaurant_risk")

    assert rr is not None
    assert rr.get("restaurants_total") == 2
    assert rr.get("restaurants_at_risk") == 1
    assert rr.get("top_risk_restaurants")
    top = rr["top_risk_restaurants"][0]
    assert top["restaurant_id"] == "A"
    assert top["critical_count"] == 1
