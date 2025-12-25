import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

# Separate features from outcome variables (same as Question 2)
y = houses.price
X = houses.drop(['price', 'price_hilo'], axis=1)

# Create binned variable for stratification
y_binned = pd.qcut(y, q=100)

# Split the data (same parameters as Question 2)
X_train, X_test, y_train, y_test = train_test_split(X, y,
                                                    random_state=617,
                                                    train_size=0.7,
                                                    stratify=y_binned)

print("="*80)
print("MODEL 1 ON TRAINING SET")
print("="*80)

# Build model1 on training data
X_train_area = X_train[['area']]
model1_train = LinearRegression()
model1_train.fit(X_train_area, y_train)

area_coef_train = model1_train.coef_[0]
intercept_train = model1_train.intercept_

print(f"\nModel fitted on training data!")
print(f"Intercept: {intercept_train}")
print(f"Coefficient for area: {area_coef_train}")

print("\n" + "="*80)
print("MODEL 1 ON FULL DATASET")
print("="*80)

# Build model1 on full dataset
X_area = houses[['area']]
y_price = houses['price']
model1_full = LinearRegression()
model1_full.fit(X_area, y_price)

area_coef_full = model1_full.coef_[0]
intercept_full = model1_full.intercept_

print(f"\nModel fitted on full data!")
print(f"Intercept: {intercept_full}")
print(f"Coefficient for area: {area_coef_full}")

print("\n" + "="*80)
print("COMPARISON WITH OPTIONS")
print("="*80)

print(f"\nOption 1: 225.6353")
print(f"  Train set coefficient: {area_coef_train:.4f} (diff: {abs(area_coef_train - 225.6353):.4f})")
print(f"  Full set coefficient: {area_coef_full:.4f} (diff: {abs(area_coef_full - 225.6353):.4f})")

print("\n" + "="*80)
print("ANSWER TO QUESTION 11")
print("="*80)
print(f"\nCoefficient of area (train): {area_coef_train}")
print(f"Coefficient of area (full): {area_coef_full}")
print(f"\nClosest match to Option 1: 225.6353")
print(f"\nCorrect interpretation:")
print("A one unit increase in area corresponds to a 225.6353 unit increase in price")
print("="*80)

