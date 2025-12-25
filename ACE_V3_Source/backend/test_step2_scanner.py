import sys
import os
from pathlib import Path
import json

# Add project root to path
sys.path.append(os.getcwd())

from schema_scanner.scanner import scan_dataset

def test_scanner():
    print("🧪 Starting Step 2 Verification: Schema Scanner")
    
    dataset_path = "data/customer_data.csv"
    if not os.path.exists(dataset_path):
        print(f"❌ Dataset not found: {dataset_path}")
        return

    print(f"📂 Scanning dataset: {dataset_path}")
    scan_result = scan_dataset(dataset_path)
    
    # Check 1: Structure
    required_keys = ["dataset_info", "basic_types", "stats", "relationships", "warnings"]
    for key in required_keys:
        if key not in scan_result:
            print(f"❌ Missing key in output: {key}")
            return
    print("✅ Output structure is correct")

    # Check 2: Row count
    row_count = scan_result["dataset_info"]["row_count"]
    if row_count != 2000:
        print(f"❌ Expected 2000 rows, got {row_count}")
        return
    print(f"✅ Row count verified: {row_count}")

    # Check 3: Type Detection
    numeric_cols = scan_result["basic_types"]["numeric"]
    categorical_cols = scan_result["basic_types"]["categorical"]
    
    expected_numeric = ["monthly_spend", "credit_score", "age", "debt_to_income"]
    expected_categorical = ["gender", "card_brand"]
    
    for col in expected_numeric:
        if col not in numeric_cols:
            print(f"❌ Failed to detect numeric column: {col}")
            return
    print(f"✅ Correctly identified numeric columns: {expected_numeric}")
    
    for col in expected_categorical:
        if col not in categorical_cols:
            print(f"❌ Failed to detect categorical column: {col}")
            return
    print(f"✅ Correctly identified categorical columns: {expected_categorical}")

    # Check 4: Stats
    spend_stats = scan_result["stats"].get("monthly_spend")
    if not spend_stats:
        print("❌ Missing stats for monthly_spend")
        return
    
    if spend_stats["mean"] <= 0:
        print(f"❌ Invalid mean for monthly_spend: {spend_stats['mean']}")
        return
    print(f"✅ Stats computed for monthly_spend (Mean: ${spend_stats['mean']:,.2f})")

    # Check 5: Correlations
    correlations = scan_result["relationships"]["correlations"]
    if not correlations:
        print("❌ No correlations computed")
        return
    print("✅ Correlations computed successfully")

    print("\n🎉 STEP 2 VERIFICATION PASSED!")
    print("The Schema Scanner is working correctly and ready for the Schema Interpreter.")

if __name__ == "__main__":
    test_scanner()
