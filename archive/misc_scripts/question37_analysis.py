import pandas as pd
import numpy as np
from sklearn.ensemble import BaggingRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.metrics import mean_squared_error

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

# Separate features from outcome variables
y = houses.price
X = houses.drop(['price', 'price_hilo'], axis=1)

print("="*80)
print("BAGGING MODEL - 100 BOOTSTRAPPED SAMPLES")
print("="*80)
print(f"\nDataset shape: {X.shape}")
print(f"Features: {X.columns.tolist()}")

# Construct bagging model
# Base estimator: DecisionTreeRegressor with max_depth=10
# n_estimators: 100 (number of bootstrapped samples)
bagging_model = BaggingRegressor(
    estimator=DecisionTreeRegressor(max_depth=10),
    n_estimators=100,
    random_state=617,  # For reproducibility
    bootstrap=True,
    n_jobs=-1
)

print("\nBagging model parameters:")
print(f"  Base estimator: DecisionTreeRegressor(max_depth=10)")
print(f"  Number of bootstrapped samples: 100")
print(f"  Bootstrap: True")

print("\nFitting bagging model...")
bagging_model.fit(X, y)
print("Model fitted successfully!")

# Calculate train sample RMSE
y_pred_train = bagging_model.predict(X)
train_rmse = np.sqrt(mean_squared_error(y, y_pred_train))

# Also calculate R-squared
train_r2 = bagging_model.score(X, y)

print("\n" + "="*80)
print("ANSWER TO QUESTION 37")
print("="*80)
print(f"\nTrain sample RMSE: {train_rmse}")
print(f"Train R-squared: {train_r2:.6f}")

print("\n" + "="*80)
print("MODEL DETAILS")
print("="*80)
print(f"Number of base estimators: {len(bagging_model.estimators_)}")
print(f"Training observations: {X.shape[0]}")
print(f"Features used: {X.shape[1]}")

print("\n" + "="*80)
print(f"SUBMIT THIS ANSWER: {train_rmse}")
print("="*80)

