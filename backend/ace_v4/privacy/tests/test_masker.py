import pandas as pd
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from ace_v4.privacy.masker import Masker

def test_mask_email():
    m = Masker()
    masked = m.mask_value("john@example.com", "email")
    assert masked.startswith("***@")
    assert masked.endswith("example.com")
    print("✅ test_mask_email passed")

def test_mask_dataframe_safe():
    df = pd.DataFrame({
        "email": ["a@b.com"],
        "name": ["John"],
        "public": ["data"]
    })
    
    pii_map = {"email": "email", "name": "name"}
    m = Masker()
    
    # Safe mode should mask PII
    safe_df = m.mask_dataframe(df, pii_map, mode="safe")
    
    assert safe_df["email"].iloc[0].startswith("***@")
    assert safe_df["name"].iloc[0].endswith("***")
    assert safe_df["public"].iloc[0] == "data"
    print("✅ test_mask_dataframe_safe passed")

def test_mask_dataframe_log():
    df = pd.DataFrame({
        "email": ["a@b.com"],
        "public": ["data"]
    })
    
    pii_map = {"email": "email"}
    m = Masker()
    
    # Log mode should mask everything
    log_df = m.mask_dataframe(df, pii_map, mode="log")
    
    assert log_df["email"].iloc[0] == "***"
    assert log_df["public"].iloc[0] == "***"
    print("✅ test_mask_dataframe_log passed")

if __name__ == "__main__":
    test_mask_email()
    test_mask_dataframe_safe()
    test_mask_dataframe_log()
