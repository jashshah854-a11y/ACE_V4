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
print("QUESTION 29 - PREDICTION USING REGRESSION TREE")
print("="*80)

# Build the same regression tree from Q27
tree_model = DecisionTreeRegressor(max_depth=4, random_state=617)
tree_model.fit(X_train, y_train)

print("\nRegression tree fitted (max_depth=4, random_state=617)")

# Create the input for prediction
# House characteristics:
# - 5 bedrooms, 3 bathrooms, 4000 area, 6000 lot_size
# - 2 floors, 1 garage, fireplace, renovated
# - good neighborhood, 10 miles from city, 30 years old

house_input = pd.DataFrame({
    'bedrooms': [5],
    'bathrooms': [3],
    'area': [4000],
    'lot_size': [6000],
    'floors': [2],
    'age': [30],
    'garage': [1],
    'fireplace': [1],
    'renovated': [1],
    'neighborhood': [1],  # 1 = good neighborhood
    'distance_city': [10]
})

print("\n" + "="*80)
print("HOUSE CHARACTERISTICS FOR PREDICTION")
print("="*80)
print(house_input.T)

# Make prediction
predicted_price = tree_model.predict(house_input)[0]

print("\n" + "="*80)
print("ANSWER TO QUESTION 29")
print("="*80)
print(f"\nPredicted price: ${predicted_price:,.2f}")
print(f"\nFull precision: {predicted_price}")
print("="*80)

# Additional context
print("\nModel details:")
print(f"R-squared (train): {tree_model.score(X_train, y_train):.6f}")
print(f"R-squared (test): {tree_model.score(X_test, y_test):.6f}")

# Show feature importances for reference
print("\nTop features used by the tree:")
importances = pd.DataFrame({
    'Feature': X.columns,
    'Importance': tree_model.feature_importances_
}).sort_values('Importance', ascending=False).head(3)
print(importances.to_string(index=False))

