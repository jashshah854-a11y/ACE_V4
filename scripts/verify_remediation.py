
import pandas as pd
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from agents.data_typing import detect_time_signal, score_data_types

def test_time_detection():
    print("Testing Time Detection...")
    # 1. Negative Case (Static Customer Data)
    df_static = pd.DataFrame({
        "customerid": [1, 2],
        "annualincome": [50000, 60000],
        "lifetime_value": [1000, 2000], # This was triggering false positive!
        "maritalstatus": ["Single", "Married"]
    })
    
    is_time = detect_time_signal(df_static)
    if not is_time:
        print("PASS: Static dataframe correctly identified as NO time signal.")
    else:
        print("FAIL: Static dataframe incorrectly identified as having time signal.")
        
    # 2. Positive Case (Explicit Date)
    df_time = pd.DataFrame({
        "transaction_date": ["2023-01-01", "2023-01-02"],
        "amount": [100, 200]
    })
    is_time_2 = detect_time_signal(df_time)
    if is_time_2:
        print("PASS: Time dataframe correctly identified as having time signal.")
    else:
        print("FAIL: Time dataframe incorrectly identified as NO time signal.")

def test_data_typing():
    print("\nTesting Data Typing...")
    # Customer Data
    df_cust = pd.DataFrame(columns=["customer_id", "numtransactions", "points", "loyalty_tier", "churn_risk"])
    scores = score_data_types(df_cust)
    top_type, score = scores[0]
    
    print(f"Top detected type: {top_type} (Score: {score})")
    
    if top_type == "customer_behavior":
        print("PASS: Correctly classified as customer_behavior.")
    else:
        print(f"FAIL: Classified as {top_type}, expected customer_behavior.")

if __name__ == "__main__":
    test_time_detection()
    test_data_typing()
