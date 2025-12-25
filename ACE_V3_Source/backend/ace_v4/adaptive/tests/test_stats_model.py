import pandas as pd
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from ace_v4.adaptive.stats_model import StatsModel

def test_stats_model_outlier():
    # Create data with clear outlier
    data = [10, 12, 11, 13, 10, 12, 11, 100] # 100 is outlier
    series = pd.Series(data)
    
    model = StatsModel()
    model.fit(series)
    
    assert model.score(100) == "hard"
    assert model.score(12) == "normal"
    print("✅ test_stats_model_outlier passed")

if __name__ == "__main__":
    test_stats_model_outlier()
