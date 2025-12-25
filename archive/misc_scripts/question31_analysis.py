import pandas as pd
from sklearn.tree import DecisionTreeRegressor

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

# Separate features from outcome variables
y = houses.price
X = houses.drop(['price', 'price_hilo'], axis=1)

print("="*80)
print("QUESTION 31 - PREDICTION USING REGRESSION TREE")
print("="*80)

# Build regression tree on FULL dataset (as determined in Q29)
tree_model = DecisionTreeRegressor(max_depth=4, random_state=617)
tree_model.fit(X, y)

print("\nRegression tree fitted on full dataset (max_depth=4, random_state=617)")

# Create the input for prediction
# House characteristics:
# - 1 bedroom, 1 bathroom, 1000 area, 2000 lot_size
# - 1 floor, no garage (0), no fireplace (0), not renovated (0)
# - bad neighborhood (0), 40 miles from city, 60 years old

house_input = pd.DataFrame({
    'bedrooms': [1],
    'bathrooms': [1],
    'area': [1000],
    'lot_size': [2000],
    'floors': [1],
    'age': [60],
    'garage': [0],
    'fireplace': [0],
    'renovated': [0],
    'neighborhood': [0],  # 0 = bad neighborhood
    'distance_city': [40]
})

# Ensure column order matches
house_input = house_input[X.columns]

print("\n" + "="*80)
print("HOUSE CHARACTERISTICS FOR PREDICTION")
print("="*80)
print(house_input.T)

# Make prediction
predicted_price = tree_model.predict(house_input)[0]

print("\n" + "="*80)
print("ANSWER TO QUESTION 31")
print("="*80)
print(f"\nPredicted price: ${predicted_price:,.2f}")
print(f"\nFull precision: {predicted_price}")
print("="*80)

# Additional context
print("\nModel details:")
print(f"Training observations: {X.shape[0]}")
print(f"R-squared (full dataset): {tree_model.score(X, y):.6f}")

# Show which features the tree uses
print("\nTop features used by the tree:")
importances = pd.DataFrame({
    'Feature': X.columns,
    'Importance': tree_model.feature_importances_
}).sort_values('Importance', ascending=False).head(3)
print(importances.to_string(index=False))

