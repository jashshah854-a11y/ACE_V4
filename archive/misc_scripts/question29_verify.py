import pandas as pd
from sklearn.tree import DecisionTreeRegressor
from sklearn.model_selection import train_test_split

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

# Separate features from outcome variables
y = houses.price
X = houses.drop(['price', 'price_hilo'], axis=1)

print("="*80)
print("TESTING TWO APPROACHES")
print("="*80)

# APPROACH 1: Train on training set only (what I did)
y_binned = pd.qcut(y, q=100)
X_train, X_test, y_train, y_test = train_test_split(X, y,
                                                    random_state=617,
                                                    train_size=0.7,
                                                    stratify=y_binned)

tree_train = DecisionTreeRegressor(max_depth=4, random_state=617)
tree_train.fit(X_train, y_train)

# APPROACH 2: Train on full dataset
tree_full = DecisionTreeRegressor(max_depth=4, random_state=617)
tree_full.fit(X, y)

# Create house input
house_input = pd.DataFrame({
    'bedrooms': [5], 'bathrooms': [3], 'area': [4000], 'lot_size': [6000],
    'floors': [2], 'age': [30], 'garage': [1], 'fireplace': [1],
    'renovated': [1], 'neighborhood': [1], 'distance_city': [10]
})

# Make predictions
pred_train = tree_train.predict(house_input)[0]
pred_full = tree_full.predict(house_input)[0]

print("\nAPPROACH 1: Tree trained on training set")
print(f"Predicted price: {pred_train}")

print("\nAPPROACH 2: Tree trained on full dataset")
print(f"Predicted price: {pred_full}")

print("\nGPT Codex answer: 1058999.2617421008")

print("\n" + "="*80)
print("COMPARISON")
print("="*80)
print(f"My original answer (train set):  {pred_train}")
print(f"Full dataset approach:           {pred_full}")
print(f"GPT Codex answer:                1058999.2617421008")
print(f"\nDifference (full - train):       {pred_full - pred_train}")
print(f"Difference (Codex - full):       {1058999.2617421008 - pred_full}")
print("="*80)

# Check which matches Codex
if abs(pred_full - 1058999.2617421008) < 0.01:
    print("\n✓ FULL DATASET approach matches GPT Codex!")
elif abs(pred_train - 1058999.2617421008) < 0.01:
    print("\n✓ TRAINING SET approach matches GPT Codex!")
else:
    print("\n? Neither approach exactly matches GPT Codex")
    print(f"Closest: {'FULL' if abs(pred_full - 1058999.2617421008) < abs(pred_train - 1058999.2617421008) else 'TRAIN'}")

