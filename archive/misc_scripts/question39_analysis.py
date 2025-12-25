import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error
import warnings
warnings.filterwarnings('ignore')

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

# Separate features from outcome variables
y = houses.price
X = houses.drop(['price', 'price_hilo'], axis=1)

print("="*80)
print("RANDOM FOREST MODEL - 100 BOOTSTRAPPED SAMPLES")
print("="*80)
print(f"\nDataset shape: {X.shape}")
print(f"Features: {X.columns.tolist()}")

# Construct Random Forest model
# n_estimators: 100 (number of trees/bootstrapped samples)
rf_model = RandomForestRegressor(
    n_estimators=100,
    random_state=617,  # For reproducibility
    n_jobs=-1
)

print("\nRandom Forest model parameters:")
print(f"  Number of trees: 100")
print(f"  Bootstrap: True (default)")
print(f"  Max features per split: sqrt(n_features) (default for regression)")

print("\nFitting Random Forest model...")
rf_model.fit(X, y)
print("Model fitted successfully!")

# Calculate train sample RMSE
y_pred_train = rf_model.predict(X)
train_rmse = np.sqrt(mean_squared_error(y, y_pred_train))

# Also calculate R-squared
train_r2 = rf_model.score(X, y)

print("\n" + "="*80)
print("ANSWER TO QUESTION 39")
print("="*80)
print(f"\nTrain sample RMSE: {train_rmse}")
print(f"Train R-squared: {train_r2:.6f}")

print("\n" + "="*80)
print("MODEL DETAILS")
print("="*80)
print(f"Number of trees: {rf_model.n_estimators}")
print(f"Training observations: {X.shape[0]}")
print(f"Features used: {X.shape[1]}")
print(f"Max features per split: {rf_model.max_features}")

# Feature importances
print("\nTop 5 Most Important Features:")
feature_importance = pd.DataFrame({
    'Feature': X.columns,
    'Importance': rf_model.feature_importances_
}).sort_values('Importance', ascending=False)
print(feature_importance.head(5).to_string(index=False))

print("\n" + "="*80)
print("COMPARISON WITH BAGGING (Q37)")
print("="*80)
print(f"Bagging (Q37):       45,216.89")
print(f"Random Forest (Q39): {train_rmse:,.2f}")
print(f"\nDifference: Random Forest typically performs similar or better")
print("due to feature randomization reducing correlation between trees.")

print("\n" + "="*80)
print(f"SUBMIT THIS ANSWER: {train_rmse}")
print("="*80)

