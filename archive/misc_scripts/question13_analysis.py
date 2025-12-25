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
print("MODEL 2: Linear Regression - Price ~ Neighborhood")
print("="*80)

# Check neighborhood variable
print(f"\nNeighborhood variable in training set:")
print(f"Unique values: {sorted(X_train['neighborhood'].unique())}")
print(f"Value counts:\n{X_train['neighborhood'].value_counts().sort_index()}")

# Build model2: price ~ neighborhood
X_train_neighborhood = X_train[['neighborhood']]
model2 = LinearRegression()
model2.fit(X_train_neighborhood, y_train)

# Get coefficient and intercept
neighborhood_coefficient = model2.coef_[0]
intercept = model2.intercept_

print(f"\n" + "="*80)
print("MODEL 2 RESULTS")
print("="*80)
print(f"\nIntercept: {intercept}")
print(f"Coefficient for neighborhood: {neighborhood_coefficient}")

# Calculate R-squared
r_squared = model2.score(X_train_neighborhood, y_train)
print(f"R-squared: {r_squared}")

# Interpretation
print(f"\n" + "="*80)
print("INTERPRETATION")
print("="*80)

# Calculate predicted prices for bad and good neighborhoods
price_bad_neighborhood = intercept + (neighborhood_coefficient * 0)
price_good_neighborhood = intercept + (neighborhood_coefficient * 1)

print(f"\nPredicted price for bad neighborhood (neighborhood=0): ${price_bad_neighborhood:,.2f}")
print(f"Predicted price for good neighborhood (neighborhood=1): ${price_good_neighborhood:,.2f}")
print(f"\nPrice difference: ${neighborhood_coefficient:,.2f}")

# Verify with actual means
train_with_price = X_train.assign(price=y_train)
mean_price_bad = train_with_price[train_with_price['neighborhood'] == 0]['price'].mean()
mean_price_good = train_with_price[train_with_price['neighborhood'] == 1]['price'].mean()

print(f"\nVerification (actual means in training data):")
print(f"Mean price for bad neighborhood: ${mean_price_bad:,.2f}")
print(f"Mean price for good neighborhood: ${mean_price_good:,.2f}")
print(f"Difference: ${mean_price_good - mean_price_bad:,.2f}")

print(f"\n" + "="*80)
print("ANSWER TO QUESTION 13")
print("="*80)
print(f"\nHow much higher is the price for a house in a good neighborhood")
print(f"compared to one in a bad neighborhood?")
print(f"\nAnswer: ${neighborhood_coefficient:,.2f}")
print(f"\nFull precision: {neighborhood_coefficient}")
print("="*80)

