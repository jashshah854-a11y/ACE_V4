import pandas as pd
from sklearn.tree import DecisionTreeRegressor
from sklearn.model_selection import train_test_split

houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")
y = houses.price
X = houses.drop(['price', 'price_hilo'], axis=1)

print("="*80)
print("VERIFYING FEATURE ALIGNMENT")
print("="*80)

# Check full dataset columns
print("\nFull dataset X columns:")
print(list(X.columns))

# Create train/test split
y_binned = pd.qcut(y, q=100)
X_train, X_test, y_train, y_test = train_test_split(X, y,
                                                    random_state=617,
                                                    train_size=0.7,
                                                    stratify=y_binned)

print("\nX_train columns:")
print(list(X_train.columns))

print("\nColumns match?", list(X.columns) == list(X_train.columns))

# Train both models
tree_full = DecisionTreeRegressor(max_depth=4, random_state=617)
tree_full.fit(X, y)

tree_train = DecisionTreeRegressor(max_depth=4, random_state=617)
tree_train.fit(X_train, y_train)

# Create input with EXACT column order
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
    'neighborhood': [1],
    'distance_city': [10]
})

print("\nInput columns:")
print(list(house_input.columns))

print("\nInput matches X columns?", list(house_input.columns) == list(X.columns))

# Reorder input to match exactly
house_input_ordered = house_input[X.columns]

print("\nReordered input columns:")
print(list(house_input_ordered.columns))
print("Now matches?", list(house_input_ordered.columns) == list(X.columns))

# Make predictions with properly ordered input
pred_full = tree_full.predict(house_input_ordered)[0]
pred_train = tree_train.predict(house_input_ordered)[0]

print("\n" + "="*80)
print("PREDICTIONS WITH PROPERLY ALIGNED FEATURES")
print("="*80)
print(f"\nTree on FULL dataset:     {pred_full}")
print(f"Tree on TRAINING set:     {pred_train}")
print(f"GPT Codex answer:         1058999.2617421008")
print(f"\nDiff (Codex - Full):      {abs(1058999.2617421008 - pred_full):.10f}")
print(f"Diff (Codex - Train):     {abs(1058999.2617421008 - pred_train):.10f}")

print("\n" + "="*80)
print("INTERPRETATION OF Q27")
print("="*80)
print("\nQ27 text: 'Construct a regression tree to predict price'")
print("         'with all other variables (except price_hilo).'")
print("         'Set max_depth to 4 and use random_state of 617.'")
print("\nQ27 does NOT mention:")
print("  - Using the train/test split from Q2")
print("  - Training only on training data")
print("\nTherefore, the standard interpretation would be:")
print("  → Train on the FULL dataset")
print("\nHowever, if Q27 intended to use the train/test split,")
print("it would typically reference Q2 explicitly.")
print("="*80)

