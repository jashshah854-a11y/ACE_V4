import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeRegressor
from sklearn.metrics import mean_squared_error

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

# Separate features from outcome variables
y = houses.price
X = houses.drop(['price', 'price_hilo'], axis=1)

print("="*80)
print("TRAIN SAMPLE RMSE - REGRESSION TREE (max_depth=8)")
print("="*80)

# Train the regression tree with optimal max_depth=8 on full dataset
tree_best = DecisionTreeRegressor(max_depth=8, random_state=617)
tree_best.fit(X, y)

print(f"\nRegression tree fitted:")
print(f"  max_depth: 8")
print(f"  random_state: 617")
print(f"  Training observations: {X.shape[0]}")

# Calculate predictions on training data (the full dataset)
y_pred_train = tree_best.predict(X)

# Calculate RMSE
train_rmse = np.sqrt(mean_squared_error(y, y_pred_train))

# Also calculate R-squared
train_r2 = tree_best.score(X, y)

print("\n" + "="*80)
print("ANSWER TO QUESTION 35")
print("="*80)
print(f"\nTrain sample RMSE: {train_rmse}")
print(f"Train R-squared: {train_r2:.6f}")

print("\n" + "="*80)
print("COMPARISON WITH Q33 CV RESULTS")
print("="*80)
print(f"\nQ33 Cross-validation RMSE (5-fold): 58,267.92")
print(f"Q35 Train sample RMSE:              {train_rmse:,.2f}")
print(f"\nNote: Train RMSE is typically lower than CV RMSE")
print("      because it evaluates on the same data used for training.")

print("\n" + "="*80)
print(f"SUBMIT THIS ANSWER: {train_rmse}")
print("="*80)

