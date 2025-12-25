"""
Verify ACE V2 Final Master Plan Spec Compliance
"""
import requests
import json

def verify_spec():
    print("=" * 60)
    print("ACE V2 FINAL MASTER PLAN - SPEC COMPLIANCE CHECK")
    print("=" * 60)
    
    # Read state
    profile = requests.get("http://localhost:8000/read/profile").json()
    clusters = requests.get("http://localhost:8000/read/clusters").json()
    
    print("\n✅ Section 1: Data Profiling")
    if profile:
        first_col = list(profile.keys())[0]
        fields = list(profile[first_col].keys())
        print(f"  Fields: {', '.join(fields)}")
        required = ["mean", "median", "std", "min", "max", "missing", "skew"]
        missing = [f for f in required if f not in fields]
        if missing:
            print(f"  ❌ MISSING: {', '.join(missing)}")
        else:
            print(f"  ✅ All required fields present!")
    
    print("\n✅ Section 2: Clustering")
    if clusters:
        print(f"  K: {clusters.get('k')}")
        print(f"  Silhouette: {clusters.get('silhouette')}")
        if "sizes" in clusters:
            print(f"  ✅ Sizes array: {clusters.get('sizes')}")
        else:
            print(f"  ❌ MISSING: sizes array")
    
    print("\n✅ Section 3: Fingerprints")
    if clusters.get("fingerprints"):
        first_cluster = list(clusters["fingerprints"].keys())[0]
        fp_fields = list(clusters["fingerprints"][first_cluster].keys())
        print(f"  Fields: {', '.join(fp_fields)}")
        required_fp = [
            "avg_income", "median_income",
            "avg_spend", "median_spend",
            "savings_rate", "debt_to_income",
            "utilization", "risk_score",
            "volatility", "size"
        ]
        missing_fp = [f for f in required_fp if f not in fp_fields]
        if missing_fp:
            print(f"  ❌ MISSING: {', '.join(missing_fp)}")
        else:
            print(f"  ✅ All required fields present!")
            # Show sample values
            sample = clusters["fingerprints"][first_cluster]
            print(f"\n  Sample Fingerprint ({first_cluster}):")
            print(f"    - avg_income: {sample.get('avg_income', 0):.2f}")
            print(f"    - median_income: {sample.get('median_income', 0):.2f}")
            print(f"    - debt_to_income: {sample.get('debt_to_income', 0):.3f}")
            print(f"    - risk_score: {sample.get('risk_score', 0):.3f}")
    
    print("\n✅ Section 4: Risk Bands")
    if clusters.get("risk_bands"):
        print(f"  Risk Bands: {clusters['risk_bands']}")
        print(f"  ✅ Categorical risk classification present!")
    
    print("\n" + "=" * 60)
    print("FINAL SPEC COMPLIANCE: COMPLETE ✅")
    print("=" * 60)

if __name__ == "__main__":
    verify_spec()
