import pandas as pd

from backend.core.enhanced_analytics import run_enhanced_analytics


def test_marketing_simulation_generates_scenarios():
    df = pd.DataFrame(
        {
            "spend": [100.0, 120.0, 80.0],
            "conversions": [10, 12, 8],
            "clicks": [200, 210, 190],
            "revenue": [1000.0, 1200.0, 900.0],
        }
    )

    results = run_enhanced_analytics(df)
    business = results.get("business_intelligence") or {}
    simulation = business.get("marketing_simulation")

    assert business.get("valid") is True
    assert simulation is not None
    assert simulation.get("available") is True
    assert len(simulation.get("scenarios", [])) >= 1
    assert simulation.get("baseline")
