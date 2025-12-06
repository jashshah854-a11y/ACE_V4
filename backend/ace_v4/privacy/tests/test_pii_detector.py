import pandas as pd
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from ace_v4.privacy.pii_detector import PIIDetector

def test_email_detection():
    df = pd.DataFrame({
        "customer_email": ["a@b.com", "x@y.org"],
        "other_col": ["foo", "bar"]
    })

    pii = PIIDetector().detect_columns(df)
    assert "customer_email" in pii
    assert pii["customer_email"] == "email"
    assert "other_col" not in pii
    print("✅ test_email_detection passed")

def test_phone_detection():
    df = pd.DataFrame({
        "contact": ["+1-555-0199", "555-0100"],
        "val": [1, 2]
    })
    
    pii = PIIDetector().detect_columns(df)
    assert "contact" in pii
    assert pii["contact"] == "phone"
    print("✅ test_phone_detection passed")

if __name__ == "__main__":
    test_email_detection()
    test_phone_detection()
