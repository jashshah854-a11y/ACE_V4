import pandas as pd
import numpy as np
from sklearn.ensemble import BaggingRegressor, RandomForestRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
import warnings
warnings.filterwarnings('ignore')

# Load the data
print("Loading Spotify data...")
df = pd.read_csv(r"C:\Users\jashs\Projects\spotify_data.csv")

print(f"Dataset shape: {df.shape}")
print(f"\nColumns: {df.columns.tolist()}")
print(f"\nFirst few rows:")
print(df.head())

# Prepare the data - separate features and target
# Drop non-predictive columns (id, performer, song, genre text)
columns_to_drop = ['id', 'performer', 'song', 'genre', 'rating']
X = df.drop(columns=columns_to_drop, errors='ignore')
y = df['rating']

print(f"\nFeatures used: {X.columns.tolist()}")
print(f"Number of features: {X.shape[1]}")
print(f"Number of samples: {X.shape[0]}")

# Handle any missing values
X = X.fillna(X.mean())
y = y.fillna(y.mean())

print("\n" + "="*80)
print("QUESTION 1: Bagging with Regression Trees (max_depth=10)")
print("="*80)

# Question 1: Bagging with Decision Tree Regressor
bag_tree = BaggingRegressor(
    estimator=DecisionTreeRegressor(max_depth=10, random_state=42),
    n_estimators=100,
    random_state=42,
    oob_score=True
)

print("Fitting Bagging model with Decision Trees...")
bag_tree.fit(X, y)

# Predict on training data
y_pred_train_tree = bag_tree.predict(X)
rmse_train_tree = np.sqrt(mean_squared_error(y, y_pred_train_tree))

print(f"Train RMSE (Bagging with Decision Trees): {rmse_train_tree:.4f}")
print(f"OOB Score (Bagging with Decision Trees): {bag_tree.oob_score_:.4f}")

print("\n" + "="*80)
print("QUESTION 2: Bagging with Linear Regression")
print("="*80)

# Question 2: Bagging with Linear Regression
bag_linear = BaggingRegressor(
    estimator=LinearRegression(),
    n_estimators=100,
    random_state=42,
    oob_score=True
)

print("Fitting Bagging model with Linear Regression...")
bag_linear.fit(X, y)

# Predict on training data
y_pred_train_linear = bag_linear.predict(X)
rmse_train_linear = np.sqrt(mean_squared_error(y, y_pred_train_linear))

print(f"Train RMSE (Bagging with Linear Regression): {rmse_train_linear:.4f}")
print(f"OOB Score (Bagging with Linear Regression): {bag_linear.oob_score_:.4f}")

print("\n" + "="*80)
print("QUESTION 3: Random Forest")
print("="*80)

# Question 3: Random Forest
rf = RandomForestRegressor(
    n_estimators=100,
    random_state=42,
    oob_score=True
)

print("Fitting Random Forest model...")
rf.fit(X, y)

# Predict on training data
y_pred_train_rf = rf.predict(X)
rmse_train_rf = np.sqrt(mean_squared_error(y, y_pred_train_rf))

print(f"Train RMSE (Random Forest): {rmse_train_rf:.4f}")
print(f"OOB Score (Random Forest): {rf.oob_score_:.4f}")

print("\n" + "="*80)
print("QUESTION 4: Feature Importance from Random Forest")
print("="*80)

# Question 4: Feature Importance
feature_importance = pd.DataFrame({
    'feature': X.columns,
    'importance': rf.feature_importances_
}).sort_values('importance', ascending=False)

print("\nTop 15 Most Important Features:")
print(feature_importance.head(15).to_string(index=False))

# Check specific features mentioned in the question
specific_features = ['track_duration', 'danceability', 'energy', 'loudness', 
                     'tempo', 'genre_rap', 'genre_pop']

print("\nImportance of specific features mentioned in Question 4:")
for feature in specific_features:
    if feature in X.columns:
        importance = rf.feature_importances_[X.columns.get_loc(feature)]
        print(f"  {feature}: {importance:.6f}")

# Find the most important among the options
specific_importances = {}
for feature in specific_features:
    if feature in X.columns:
        specific_importances[feature] = rf.feature_importances_[X.columns.get_loc(feature)]

most_important = max(specific_importances, key=specific_importances.get)
print(f"\nMost important feature among the options: {most_important}")

print("\n" + "="*80)
print("QUESTION 5: Comparison of OOB Scores")
print("="*80)

# Question 5: Compare OOB scores
print("\nOut-of-Bag (OOB) Scores Comparison:")
print(f"  Bagging with Decision Trees: {bag_tree.oob_score_:.6f}")
print(f"  Bagging with Linear Regression: {bag_linear.oob_score_:.6f}")
print(f"  Random Forest: {rf.oob_score_:.6f}")

oob_scores = {
    'Bag with Regression Tree': bag_tree.oob_score_,
    'Bag with Linear Regression': bag_linear.oob_score_,
    'Random Forest': rf.oob_score_
}

lowest_oob = min(oob_scores, key=oob_scores.get)
print(f"\nModel with LOWEST OOB Score: {lowest_oob} ({oob_scores[lowest_oob]:.6f})")

print("\n" + "="*80)
print("SUMMARY OF RESULTS")
print("="*80)
print(f"\nQ1. Bagging with Regression Trees - Train RMSE: {rmse_train_tree:.4f}")
print(f"Q2. Bagging with Linear Regression - Train RMSE: {rmse_train_linear:.4f}")
print(f"Q3. Random Forest - Train RMSE: {rmse_train_rf:.4f}")
print(f"Q4. Most Important Feature: {most_important}")
print(f"Q5. Lowest OOB Score: {lowest_oob}")
print("="*80)


