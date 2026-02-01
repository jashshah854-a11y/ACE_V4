"""Test drift detection module."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pandas as pd
from core.drift_detector import (
    detect_drift_adversarial,
    compute_distribution_drift,
    generate_drift_narrative,
    compare_time_periods,
)

print("=" * 60)
print("  Drift Detection Module Test")
print("=" * 60)

# Create baseline data (stable)
np.random.seed(42)
baseline = pd.DataFrame({
    'revenue': np.random.normal(5000, 500, 200),
    'spend': np.random.normal(2000, 200, 200),
    'clicks': np.random.poisson(500, 200).astype(float),
    'tenure': np.random.normal(24, 6, 200),
})

# Test 1: No drift - similar data
print("\n1. Testing NO DRIFT scenario...")
current_stable = pd.DataFrame({
    'revenue': np.random.normal(5000, 500, 200),
    'spend': np.random.normal(2000, 200, 200),
    'clicks': np.random.poisson(500, 200).astype(float),
    'tenure': np.random.normal(24, 6, 200),
})

result = detect_drift_adversarial(baseline, current_stable)
print(f"   Drift detected: {result.has_significant_drift}")
print(f"   Drift score: {result.drift_score:.2%}")
print(f"   Summary: {result.summary}")

# Test 2: Significant drift - shifted distributions
print("\n2. Testing SIGNIFICANT DRIFT scenario...")
current_drifted = pd.DataFrame({
    'revenue': np.random.normal(6500, 500, 200),  # +30% shift
    'spend': np.random.normal(3000, 200, 200),    # +50% shift
    'clicks': np.random.poisson(300, 200).astype(float),  # -40% shift
    'tenure': np.random.normal(24, 6, 200),       # No change
})

result = detect_drift_adversarial(baseline, current_drifted)
print(f"   Drift detected: {result.has_significant_drift}")
print(f"   Drift score: {result.drift_score:.2%}")
print(f"   Top drifted features:")
for f in result.drifted_features[:3]:
    print(f"      - {f['feature']}: importance={f['importance']:.3f}, shift={f.get('mean_shift_pct', 0):.1f}%")

# Test 3: Narrative generation
print("\n3. Testing narrative generation...")
narrative = generate_drift_narrative(result, "churn predictions")
print(f"   Narrative: {narrative[:200]}...")

# Test 4: Distribution drift
print("\n4. Testing distribution drift (KS-test)...")
ks_result = compute_distribution_drift(
    baseline['revenue'],
    current_drifted['revenue'],
    method='ks'
)
print(f"   KS statistic: {ks_result['statistic']:.3f}")
print(f"   P-value: {ks_result.get('p_value', 'N/A')}")
print(f"   Drift detected: {ks_result['drift_detected']}")

# Test 5: Time period comparison
print("\n5. Testing time period comparison...")
dates = pd.date_range('2024-01-01', periods=400, freq='D')
time_df = pd.concat([baseline, current_drifted], ignore_index=True)
time_df['date'] = dates

time_result = compare_time_periods(time_df, 'date', feature_columns=['revenue', 'spend', 'clicks', 'tenure'])
print(f"   Drift score: {time_result.drift_score:.2%}")
print(f"   Details: {time_result.details.get('baseline_period')} vs {time_result.details.get('current_period')}")

print("\n" + "=" * 60)
print("  ALL DRIFT TESTS COMPLETE")
print("=" * 60)
