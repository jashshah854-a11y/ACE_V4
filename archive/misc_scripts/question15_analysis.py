import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

# Separate features from outcome variables (same as Question 2)
y = houses.price
X = houses.drop(['price', 'price_hilo'], axis=1)

print(f"Features being used: {X.columns.tolist()}")
print(f"Number of features: {X.shape[1]}")

# Create binned variable for stratification
y_binned = pd.qcut(y, q=100)

# Split the data (same parameters as Question 2)
X_train, X_test, y_train, y_test = train_test_split(X, y,
                                                    random_state=617,
                                                    train_size=0.7,
                                                    stratify=y_binned)

print(f"\nTraining set shape: {X_train.shape}")
print(f"Test set shape: {X_test.shape}")

print("\n" + "="*80)
print("MODEL 3: Linear Regression - Price ~ All Variables (except price_hilo)")
print("="*80)

# Build model3: predict price using all features
model3 = LinearRegression()
model3.fit(X_train, y_train)

# Calculate R-squared on training data
r_squared_train = model3.score(X_train, y_train)

print(f"\nModel3 fitted successfully!")
print(f"Number of features used: {len(model3.coef_)}")
print(f"\nIntercept: {model3.intercept_}")

# Show coefficients
print(f"\nCoefficients:")
for feature, coef in zip(X.columns, model3.coef_):
    print(f"  {feature}: {coef}")

print("\n" + "="*80)
print("ANSWER TO QUESTION 15")
print("="*80)
print(f"\nR-squared (R2) for model3 on training data:")
print(f"{r_squared_train}")

print("\n" + "="*80)
print("Additional Information:")
print(f"R-squared (train): {r_squared_train}")
print(f"R-squared (test): {model3.score(X_test, y_test)}")
print("="*80)

