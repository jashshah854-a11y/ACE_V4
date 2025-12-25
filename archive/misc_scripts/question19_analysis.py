import numpy as np
import pandas as pd
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from scipy import stats

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
print("MODEL 4: Polynomial Regression (Linear + Quadratic Terms)")
print("="*80)

# Select only the continuous variables for polynomial features
poly_vars = ['bedrooms', 'bathrooms', 'area', 'lot_size', 'floors', 'age', 'distance_city']
X_train_poly_subset = X_train[poly_vars]
X_test_poly_subset = X_test[poly_vars]

print(f"\nVariables for polynomial features: {poly_vars}")

# Create polynomial features (degree=2, no interaction terms)
poly = PolynomialFeatures(degree=2, include_bias=False, interaction_only=False)
X_train_poly = poly.fit_transform(X_train_poly_subset)
X_test_poly = poly.transform(X_test_poly_subset)

# Get feature names
feature_names = poly.get_feature_names_out(poly_vars)
print(f"\nTotal features after polynomial transformation: {len(feature_names)}")
print(f"Feature names: {list(feature_names)}")

# Build model4
model4 = LinearRegression()
model4.fit(X_train_poly, y_train)

print(f"\nModel4 fitted successfully!")
print(f"R-squared (train): {model4.score(X_train_poly, y_train):.6f}")

# Calculate p-values manually
y_pred = model4.predict(X_train_poly)
residuals = y_train - y_pred
n = len(y_train)
p = X_train_poly.shape[1]
dof = n - p - 1

mse = np.sum(residuals**2) / dof
XtX_inv = np.linalg.inv(X_train_poly.T @ X_train_poly)
var_coef = mse * np.diag(XtX_inv)
se_coef = np.sqrt(var_coef)

t_stats = model4.coef_ / se_coef
p_values = 2 * (1 - stats.t.cdf(np.abs(t_stats), dof))

# Create results dataframe
results_df = pd.DataFrame({
    'Feature': feature_names,
    'Coefficient': model4.coef_,
    'Std_Error': se_coef,
    'T_Statistic': t_stats,
    'P_value': p_values,
    'Significant': p_values < 0.05
})

print("\n" + "="*80)
print("ALL COEFFICIENTS AND P-VALUES")
print("="*80)
print(results_df.to_string(index=False))

# Filter only quadratic terms (those with ^2)
quadratic_terms = results_df[results_df['Feature'].str.contains(r'\^2', regex=True)]

print("\n" + "="*80)
print("QUADRATIC TERMS ONLY")
print("="*80)
print(quadratic_terms.to_string(index=False))

# Identify significant quadratic terms
significant_quadratic = quadratic_terms[quadratic_terms['Significant']]['Feature'].tolist()

print("\n" + "="*80)
print("ANSWER TO QUESTION 19")
print("="*80)
print("\nWhich variables have statistically significant QUADRATIC relationships?")
print("(Testing significance of squared terms at alpha = 0.05)")
print()

# Check each variable's quadratic term
for var in poly_vars:
    quad_feature = f"{var}^2"
    if quad_feature in results_df['Feature'].values:
        row = results_df[results_df['Feature'] == quad_feature].iloc[0]
        is_sig = row['Significant']
        marker = "[X]" if is_sig else "[ ]"
        print(f"{marker} {var}")
        print(f"    Feature: {quad_feature}")
        print(f"    Coefficient: {row['Coefficient']:.6e}")
        print(f"    P-value: {row['P_value']:.4e}")
        print(f"    Significant: {is_sig}")

print("\n" + "="*80)
print("SUMMARY - SELECT THESE CHECKBOXES:")
print("="*80)

for var in poly_vars:
    quad_feature = f"{var}^2"
    if quad_feature in results_df['Feature'].values:
        row = results_df[results_df['Feature'] == quad_feature].iloc[0]
        is_sig = row['Significant']
        marker = "[X]" if is_sig else "[ ]"
        print(f"{marker} {var}")

# Check if none are significant
if len(significant_quadratic) == 0:
    print("\n[X] None of the above")
else:
    print("\n[ ] None of the above")

print("="*80)

