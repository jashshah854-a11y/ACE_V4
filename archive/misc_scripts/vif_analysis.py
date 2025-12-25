import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

# Separate features from outcome variables (same as Question 2)
y = houses.price
X = houses.drop(['price', 'price_hilo'], axis=1)

# Create binned variable for stratification
y_binned = pd.qcut(y, q=100)

# Split the data (same parameters as Question 2)
X_train, X_test, y_train, y_test = train_test_split(X, y,
                                                    random_state=617,
                                                    train_size=0.7,
                                                    stratify=y_binned)

print("="*80)
print("VARIANCE INFLATION FACTOR (VIF) ANALYSIS FOR MODEL3")
print("="*80)

# Calculate VIF for each predictor
vif_data = []

for i, col in enumerate(X_train.columns):
    # For each predictor, regress it on all other predictors
    X_i = X_train[col]
    X_others = X_train.drop(columns=[col])
    
    # Fit regression
    model = LinearRegression()
    model.fit(X_others, X_i)
    
    # Get R-squared
    r_squared = model.score(X_others, X_i)
    
    # Calculate VIF = 1 / (1 - R²)
    vif = 1 / (1 - r_squared)
    
    vif_data.append({
        'Variable': col,
        'R_squared': r_squared,
        'VIF': vif
    })
    
    print(f"\n{col}:")
    print(f"  R² (when regressed on other predictors): {r_squared:.6f}")
    print(f"  VIF: {vif:.6f}")

# Create dataframe and sort by VIF
vif_df = pd.DataFrame(vif_data)
vif_df = vif_df.sort_values('VIF', ascending=False)

print("\n" + "="*80)
print("VIF RANKINGS (Sorted by VIF - Highest to Lowest)")
print("="*80)
print("\n")
print(vif_df.to_string(index=False))

# Identify highest and second highest
highest_vif = vif_df.iloc[0]
second_highest_vif = vif_df.iloc[1]

print("\n" + "="*80)
print("ANSWER")
print("="*80)
print(f"\nHighest VIF:")
print(f"  Variable: {highest_vif['Variable']}")
print(f"  VIF: {highest_vif['VIF']:.6f}")

print(f"\nSecond Highest VIF:")
print(f"  Variable: {second_highest_vif['Variable']}")
print(f"  VIF: {second_highest_vif['VIF']:.6f}")

print("\n" + "="*80)
print(f"ANSWER: {second_highest_vif['Variable']}")
print("="*80)

# Interpretation
print("\nVIF Interpretation:")
print("  VIF = 1: No correlation with other predictors")
print("  VIF 1-5: Moderate correlation")
print("  VIF 5-10: High correlation")
print("  VIF > 10: Severe multicollinearity")

