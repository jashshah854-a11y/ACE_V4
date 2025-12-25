import pandas as pd
import numpy as np
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from ace_v4.adaptive.selector import ModelSelector
from ace_v4.adaptive.stats_model import StatsModel
from ace_v4.adaptive.ml_model import MLModel

def test_selector_low_variance():
    # Low variance data
    data = np.random.normal(100, 1, 1000) # mean 100, std 1 -> ratio 0.01
    series = pd.Series(data)
    
    selector = ModelSelector()
    model = selector.choose(series)
    
    assert isinstance(model, StatsModel)
    assert model.hard_factor == 2.0 # Strict
    print("✅ test_selector_low_variance passed")

def test_selector_high_variance():
    # High variance data
    data = np.random.normal(0, 100, 1000) # mean 0, std 100 -> ratio huge
    series = pd.Series(data)
    
    selector = ModelSelector()
    model = selector.choose(series)
    
    assert isinstance(model, StatsModel)
    assert model.soft_factor == 3.0 # Loose
    print("✅ test_selector_high_variance passed")

def test_selector_skewed():
    # Skewed data
    data = np.random.lognormal(0, 2, 1000)
    series = pd.Series(data)
    
    selector = ModelSelector()
    model = selector.choose(series)
    
    # Skew > 2 should trigger ML
    if series.skew() > 2:
        assert isinstance(model, MLModel)
    print("✅ test_selector_skewed passed")

if __name__ == "__main__":
    test_selector_low_variance()
    test_selector_high_variance()
    test_selector_skewed()
