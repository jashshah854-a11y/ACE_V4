import numpy as np
import pandas as pd
from scipy import stats

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

print("Dataset loaded successfully!")
print(f"Shape: {houses.shape}")

# Variables to test
variables_to_test = ['bedrooms', 'bathrooms', 'distance_city', 'lot_size', 'floors', 'age']

print("\n" + "="*80)
print("PEARSON CORRELATION WITH PRICE - SIGNIFICANCE TESTS")
print("="*80)

results = []

for var in variables_to_test:
    # Calculate Pearson correlation and p-value
    correlation, p_value = stats.pearsonr(houses[var], houses['price'])
    
    # Determine if statistically significant (alpha = 0.05)
    is_significant = p_value < 0.05
    
    results.append({
        'variable': var,
        'correlation': correlation,
        'p_value': p_value,
        'significant': is_significant
    })
    
    sig_marker = "*** SIGNIFICANT" if is_significant else "Not significant"
    print(f"\n{var}:")
    print(f"  Correlation coefficient: {correlation}")
    print(f"  P-value: {p_value}")
    print(f"  Status: {sig_marker}")

# Create a summary dataframe
results_df = pd.DataFrame(results)
results_df = results_df.sort_values('p_value')

print("\n" + "="*80)
print("SUMMARY TABLE (sorted by p-value)")
print("="*80)
print(results_df.to_string(index=False))

# Find statistically significant variables
significant_vars = results_df[results_df['significant']]['variable'].tolist()

print("\n" + "="*80)
print("ANSWER TO QUESTION 9")
print("="*80)
print(f"\nVariables with statistically significant Pearson correlation with price:")
print(f"(Using significance level alpha = 0.05)")
print()

if significant_vars:
    for var in significant_vars:
        row = results_df[results_df['variable'] == var].iloc[0]
        print(f"  [X] {var}")
        print(f"      - Correlation: {row['correlation']:.6f}")
        print(f"      - P-value: {row['p_value']:.2e}")
else:
    print("  None")

print("\n" + "="*80)
print("CHECKBOXES TO SELECT:")
print("="*80)
for var in variables_to_test:
    is_sig = var in significant_vars
    marker = "[X]" if is_sig else "[ ]"
    print(f"{marker} {var}")

print("="*80)
