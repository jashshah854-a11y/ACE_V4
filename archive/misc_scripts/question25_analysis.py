import numpy as np
import pandas as pd
from sklearn.linear_model import LassoCV
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

# Separate features from outcome variables
y = houses.price
X = houses.drop(['price', 'price_hilo'], axis=1)

# Create binned variable for stratification
y_binned = pd.qcut(y, q=100)

# Split the data (same as Question 2)
X_train, X_test, y_train, y_test = train_test_split(X, y,
                                                    random_state=617,
                                                    train_size=0.7,
                                                    stratify=y_binned)

# Select the same predictors as Q23
lasso_vars = ['bedrooms', 'bathrooms', 'area', 'lot_size', 'floors', 'distance_city', 'age']
X_train_subset = X_train[lasso_vars]
X_test_subset = X_test[lasso_vars]

print("="*80)
print("LASSO REGRESSION WITH 5-FOLD CROSS-VALIDATION")
print("="*80)
print(f"\nPredictors: {lasso_vars}")
print(f"Training set shape: {X_train_subset.shape}")

# Standardize the features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train_subset)
X_test_scaled = scaler.transform(X_test_subset)

print("\nFeatures standardized (mean=0, std=1)")

# Fit Lasso with 5-fold cross-validation
# LassoCV automatically selects the best alpha using CV
lasso_cv = LassoCV(cv=5, random_state=42, max_iter=10000)
lasso_cv.fit(X_train_scaled, y_train)

print(f"\nLasso model fitted with 5-fold CV")
print(f"Best alpha (regularization strength): {lasso_cv.alpha_:.6f}")
print(f"R-squared (train): {lasso_cv.score(X_train_scaled, y_train):.6f}")
print(f"R-squared (test): {lasso_cv.score(X_test_scaled, y_test):.6f}")

# Get coefficients
coefficients = lasso_cv.coef_

print("\n" + "="*80)
print("LASSO COEFFICIENTS")
print("="*80)

results = []
for var, coef in zip(lasso_vars, coefficients):
    is_zero = abs(coef) < 1e-10  # Consider very small values as 0
    results.append({
        'Variable': var,
        'Coefficient': coef,
        'Shrunk_to_0': is_zero
    })
    
    zero_marker = "→ SHRUNK TO 0" if is_zero else ""
    print(f"\n{var}:")
    print(f"  Coefficient: {coef:.6f} {zero_marker}")

# Create dataframe
results_df = pd.DataFrame(results)

print("\n" + "="*80)
print("SUMMARY TABLE")
print("="*80)
print(results_df.to_string(index=False))

# Identify which coefficients are 0
zero_coefficients = [r['Variable'] for r in results if r['Shrunk_to_0']]

print("\n" + "="*80)
print("ANSWER TO QUESTION 25")
print("="*80)
print("\nWhich Lasso coefficients shrunk to 0?")
print()

# Check each option
options = ['floors', 'bathrooms', 'age', 'distance_city']
for var in options:
    if var in zero_coefficients:
        print(f"[X] {var} - Coefficient shrunk to 0")
    else:
        print(f"[ ] {var} - Coefficient NOT 0 ({results_df[results_df['Variable']==var]['Coefficient'].values[0]:.6f})")

if len(zero_coefficients) == 0:
    print("\n[X] None of the above - No coefficients shrunk to 0")
else:
    print("\n[ ] None of the above")
    print(f"\nCoefficients that shrunk to 0: {zero_coefficients}")

print("="*80)

