import pandas as pd
import numpy as np
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from ace_v4.adaptive.ml_model import MLModel

def test_ml_model_skewed():
    # Create skewed data (log-normal)
    np.random.seed(42)
    data = np.random.lognormal(0, 1, 1000)
    # Add extreme outlier
    data = np.append(data, [10000])
    
    series = pd.Series(data)
    
    model = MLModel()
    model.fit(series)
    
    assert model.is_anomaly(10000)
    assert not model.is_anomaly(1.0)
    print("✅ test_ml_model_skewed passed")

if __name__ == "__main__":
    test_ml_model_skewed()
