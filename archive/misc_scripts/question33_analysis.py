import pandas as pd
import numpy as np
from sklearn.tree import DecisionTreeRegressor
from sklearn.model_selection import GridSearchCV

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

# Separate features from outcome variables
y = houses.price
X = houses.drop(['price', 'price_hilo'], axis=1)

print("="*80)
print("GRID SEARCH FOR MAX_DEPTH - REGRESSION TREE")
print("="*80)
print(f"\nDataset shape: {X.shape}")
print(f"Using 5-fold cross-validation with RMSE scoring")

# Create base model
tree = DecisionTreeRegressor(random_state=617)

# Define parameter grid
param_grid = {
    'max_depth': [4, 5, 6, 7, 8]
}

print(f"\nTesting max_depth values: {param_grid['max_depth']}")

# Grid search with 5-fold CV
# scoring='neg_root_mean_squared_error' gives negative RMSE (higher is better)
grid_search = GridSearchCV(
    tree,
    param_grid,
    cv=5,
    scoring='neg_root_mean_squared_error',
    return_train_score=True,
    verbose=1
)

print("\nRunning grid search...")
grid_search.fit(X, y)

# Get results
results = pd.DataFrame(grid_search.cv_results_)

print("\n" + "="*80)
print("GRID SEARCH RESULTS")
print("="*80)

# Extract relevant columns
results_summary = results[['param_max_depth', 'mean_test_score', 'std_test_score', 'rank_test_score']].copy()

# Convert negative RMSE to positive RMSE for clarity
results_summary['mean_test_rmse'] = -results_summary['mean_test_score']
results_summary['std_test_rmse'] = results_summary['std_test_score']

# Sort by RMSE (lower is better)
results_summary = results_summary.sort_values('mean_test_rmse')

print("\nResults sorted by RMSE (lower is better):")
print("\nmax_depth | Mean CV RMSE | Std CV RMSE | Rank")
print("-" * 60)
for _, row in results_summary.iterrows():
    print(f"    {int(row['param_max_depth'])}     | {row['mean_test_rmse']:12.2f} | {row['std_test_rmse']:11.2f} | {int(row['rank_test_score'])}")

# Best parameters
best_depth = grid_search.best_params_['max_depth']
best_rmse = -grid_search.best_score_

print("\n" + "="*80)
print("ANSWER TO QUESTION 33")
print("="*80)
print(f"\nBest max_depth: {best_depth}")
print(f"Lowest RMSE: {best_rmse:.6f}")

# Show all scores for clarity
print("\n" + "="*80)
print("DETAILED RESULTS")
print("="*80)
for depth in [4, 5, 6, 7, 8]:
    row = results_summary[results_summary['param_max_depth'] == depth].iloc[0]
    marker = " <- LOWEST RMSE" if depth == best_depth else ""
    print(f"max_depth={depth}: RMSE={row['mean_test_rmse']:.6f}{marker}")

print("\n" + "="*80)
print(f"SELECT: max_depth = {best_depth}")
print("="*80)

