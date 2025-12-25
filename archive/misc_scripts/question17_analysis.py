import numpy as np
import pandas as pd
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
print("MODEL 3: Statistical Significance Tests")
print("="*80)

# Build model3
model3 = LinearRegression()
model3.fit(X_train, y_train)

# Get predictions and residuals
y_pred = model3.predict(X_train)
residuals = y_train - y_pred

# Calculate standard errors for coefficients
n = len(y_train)
p = X_train.shape[1]
dof = n - p - 1  # degrees of freedom

# Mean squared error
mse = np.sum(residuals**2) / dof

# Variance-covariance matrix
X_train_array = X_train.values
XtX_inv = np.linalg.inv(X_train_array.T @ X_train_array)
var_coef = mse * np.diag(XtX_inv)
se_coef = np.sqrt(var_coef)

# Calculate t-statistics and p-values
t_stats = model3.coef_ / se_coef
p_values = 2 * (1 - stats.t.cdf(np.abs(t_stats), dof))

print(f"\nModel details:")
print(f"Number of observations: {n}")
print(f"Number of features: {p}")
print(f"Degrees of freedom: {dof}")
print(f"MSE: {mse:.2f}")

# Create results dataframe
results_df = pd.DataFrame({
    'Variable': X_train.columns,
    'Coefficient': model3.coef_,
    'Std_Error': se_coef,
    'T_Statistic': t_stats,
    'P_value': p_values,
    'Significant': p_values < 0.05
})

results_df = results_df.sort_values('P_value')

print("\n" + "="*80)
print("COEFFICIENTS, T-STATISTICS, AND P-VALUES")
print("="*80)
print("\n")
print(results_df.to_string(index=False))

# Identify significant variables
significant_vars = results_df[results_df['Significant']]['Variable'].tolist()

print("\n" + "="*80)
print("ANSWER TO QUESTION 17")
print("="*80)
print("\nVariables with statistically significant effect on price (alpha = 0.05):")
print()

# Check all variables in original order
all_vars = ['bedrooms', 'bathrooms', 'area', 'lot_size', 'floors', 'age', 
            'garage', 'fireplace', 'renovated', 'neighborhood', 'distance_city']

for var in all_vars:
    row = results_df[results_df['Variable'] == var].iloc[0]
    is_sig = row['Significant']
    marker = "[X]" if is_sig else "[ ]"
    print(f"{marker} {var}")
    print(f"    Coefficient: {row['Coefficient']:.4f}, P-value: {row['P_value']:.4e}, Significant: {is_sig}")

print("\n" + "="*80)
print("SUMMARY - SELECT THESE CHECKBOXES:")
print("="*80)

for var in all_vars:
    is_sig = var in significant_vars
    marker = "[X]" if is_sig else "[ ]"
    print(f"{marker} {var}")

print("\n" + "="*80)
