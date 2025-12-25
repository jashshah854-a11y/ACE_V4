import pandas as pd
from sklearn.tree import DecisionTreeRegressor
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

print("="*80)
print("REGRESSION TREE - max_depth=4, random_state=617")
print("="*80)
print(f"\nFeatures: {X.columns.tolist()}")
print(f"Number of features: {X.shape[1]}")
print(f"Training set shape: {X_train.shape}")

# Build regression tree
tree_model = DecisionTreeRegressor(max_depth=4, random_state=617)
tree_model.fit(X_train, y_train)

print(f"\nRegression tree fitted successfully!")
print(f"R-squared (train): {tree_model.score(X_train, y_train):.6f}")
print(f"R-squared (test): {tree_model.score(X_test, y_test):.6f}")

# Get feature importances
feature_importances = tree_model.feature_importances_

print("\n" + "="*80)
print("FEATURE IMPORTANCES")
print("="*80)

# Create dataframe with importances
importance_df = pd.DataFrame({
    'Feature': X.columns,
    'Importance': feature_importances
}).sort_values('Importance', ascending=False)

print("\n")
print(importance_df.to_string(index=False))

# Identify most important feature
most_important = importance_df.iloc[0]

print("\n" + "="*80)
print("ANSWER TO QUESTION 27")
print("="*80)
print(f"\nMost important predictor: {most_important['Feature']}")
print(f"Importance: {most_important['Importance']:.6f}")

print("\n" + "="*80)
print("TOP 5 MOST IMPORTANT FEATURES:")
print("="*80)
for i, row in importance_df.head(5).iterrows():
    marker = "← MOST IMPORTANT" if row['Feature'] == most_important['Feature'] else ""
    print(f"{row['Feature']}: {row['Importance']:.6f} {marker}")

print("\n" + "="*80)
print("SELECT THIS ANSWER:")
print("="*80)
print(f"[ ] {most_important['Feature']} ← Select this one")
print("="*80)

