import pandas as pd
import numpy as np
from sklearn.ensemble import BaggingRegressor, RandomForestRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
import warnings
warnings.filterwarnings('ignore')

# Load the data
df = pd.read_csv(r"C:\Users\jashs\Projects\spotify_data.csv")

# Prepare the data
columns_to_drop = ['id', 'performer', 'song', 'genre', 'rating']
X = df.drop(columns=columns_to_drop, errors='ignore')
y = df['rating']

# Handle any missing values
X = X.fillna(X.mean())
y = y.fillna(y.mean())

print("="*80)
print("FULL PRECISION RESULTS")
print("="*80)

# Question 1: Bagging with Decision Tree Regressor
bag_tree = BaggingRegressor(
    estimator=DecisionTreeRegressor(max_depth=10, random_state=42),
    n_estimators=100,
    random_state=42,
    oob_score=True
)
bag_tree.fit(X, y)
y_pred_train_tree = bag_tree.predict(X)
rmse_train_tree = np.sqrt(mean_squared_error(y, y_pred_train_tree))

print(f"\nQuestion 1 - Bagging with Regression Trees:")
print(f"Train RMSE: {rmse_train_tree}")

# Question 2: Bagging with Linear Regression
bag_linear = BaggingRegressor(
    estimator=LinearRegression(),
    n_estimators=100,
    random_state=42,
    oob_score=True
)
bag_linear.fit(X, y)
y_pred_train_linear = bag_linear.predict(X)
rmse_train_linear = np.sqrt(mean_squared_error(y, y_pred_train_linear))

print(f"\nQuestion 2 - Bagging with Linear Regression:")
print(f"Train RMSE: {rmse_train_linear}")

# Question 3: Random Forest
rf = RandomForestRegressor(
    n_estimators=100,
    random_state=42,
    oob_score=True
)
rf.fit(X, y)
y_pred_train_rf = rf.predict(X)
rmse_train_rf = np.sqrt(mean_squared_error(y, y_pred_train_rf))

print(f"\nQuestion 3 - Random Forest:")
print(f"Train RMSE: {rmse_train_rf}")

# Question 4: Feature Importance (full precision)
print(f"\nQuestion 4 - Feature Importances (full precision):")
specific_features = ['track_duration', 'danceability', 'energy', 'loudness', 
                     'tempo', 'genre_rap', 'genre_pop']

for feature in specific_features:
    if feature in X.columns:
        importance = rf.feature_importances_[X.columns.get_loc(feature)]
        print(f"  {feature}: {importance}")

# Question 5: OOB Scores (full precision)
print(f"\nQuestion 5 - OOB Scores (full precision):")
print(f"  Bagging with Regression Tree: {bag_tree.oob_score_}")
print(f"  Bagging with Linear Regression: {bag_linear.oob_score_}")
print(f"  Random Forest: {rf.oob_score_}")

print("\n" + "="*80)
print("SUMMARY - FULL PRECISION VALUES")
print("="*80)
print(f"Q1 Train RMSE: {rmse_train_tree}")
print(f"Q2 Train RMSE: {rmse_train_linear}")
print(f"Q3 Train RMSE: {rmse_train_rf}")
print(f"Q4 Most Important: track_duration = {rf.feature_importances_[X.columns.get_loc('track_duration')]}")
print(f"Q5 Lowest OOB: Bag with Linear Regression = {bag_linear.oob_score_}")
print("="*80)


