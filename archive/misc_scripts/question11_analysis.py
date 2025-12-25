import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

print("Dataset loaded successfully!")
print(f"Shape: {houses.shape}")

# Build model1: Linear regression to predict price using area
# Using full dataset
X_area = houses[['area']]
y_price = houses['price']

print("\n" + "="*80)
print("MODEL 1: Linear Regression - Price ~ Area")
print("="*80)

# Build the model
model1 = LinearRegression()
model1.fit(X_area, y_price)

# Get the coefficient and intercept
area_coefficient = model1.coef_[0]
intercept = model1.intercept_

print(f"\nModel fitted successfully!")
print(f"Intercept: {intercept}")
print(f"Coefficient for area: {area_coefficient}")

# Calculate R-squared
r_squared = model1.score(X_area, y_price)
print(f"R-squared: {r_squared}")

# Interpretation
print("\n" + "="*80)
print("ANSWER TO QUESTION 11")
print("="*80)
print(f"\nCoefficient of area: {area_coefficient}")
print(f"\nInterpretation:")
print(f"A one unit increase in area corresponds to a {area_coefficient:.4f} unit increase in price")
print(f"\nIn scientific notation: {area_coefficient:.4e}")

# Check which option matches
print("\n" + "="*80)
print("CHECKING AGAINST OPTIONS:")
print("="*80)
print(f"\nOption 1: 225.6353")
print(f"  Match: {abs(area_coefficient - 225.6353) < 0.001}")

print(f"\nOption 2: 0.872")
print(f"  Match: {abs(area_coefficient - 0.872) < 0.001}")

print(f"\nOption 3: 1.712e+05")
print(f"  Match: {abs(area_coefficient - 1.712e5) < 1}")

print(f"\nOption 4: area is not related to price")
print(f"  Match: False (coefficient is non-zero and significant)")

print("\n" + "="*80)
print("CORRECT ANSWER:")
print("="*80)

if abs(area_coefficient - 225.6353) < 0.1:
    print("A one unit increase in area corresponds to a 225.6353 unit increase in price")
elif abs(area_coefficient - 0.872) < 0.1:
    print("A one unit increase in area corresponds to a 0.872 unit increase in price")
elif abs(area_coefficient - 1.712e5) < 100:
    print("A one unit increase in area corresponds to a 1.712e+05 unit increase in price")
else:
    print(f"The coefficient is: {area_coefficient}")

print("="*80)

# Additional verification
print(f"\nAdditional model details:")
print(f"Number of observations: {len(houses)}")
print(f"Mean price: ${y_price.mean():,.2f}")
print(f"Mean area: {X_area['area'].mean():.2f} sq ft")

