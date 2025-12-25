import numpy as np
import pandas as pd

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

print("Dataset loaded successfully!")
print(f"Shape: {houses.shape}")

# Check the neighborhood column values
print(f"\nNeighborhood column unique values: {houses['neighborhood'].unique()}")
print(f"Neighborhood value counts:\n{houses['neighborhood'].value_counts()}")

# Check bathrooms column
print(f"\nBathrooms column stats:")
print(houses['bathrooms'].describe())

# Filter for houses with two or more bathrooms AND in a good neighborhood
# Assuming neighborhood == 1 means "good neighborhood"
filtered_houses = houses[(houses['bathrooms'] >= 2) & (houses['neighborhood'] == 1)]

print(f"\nFiltered dataset:")
print(f"Number of houses with bathrooms >= 2 AND neighborhood == 1: {len(filtered_houses)}")

# Calculate average area for filtered houses
average_area_filtered = filtered_houses['area'].mean()

print("\n" + "="*80)
print("ANSWER TO QUESTION 3")
print("="*80)
print(f"\nAverage area for houses with:")
print(f"  - Two or more bathrooms (bathrooms >= 2)")
print(f"  - In a good neighborhood (neighborhood == 1)")
print(f"\nAverage area: {average_area_filtered}")
print("="*80)

# Additional verification
print(f"\nVerification:")
print(f"Total houses in dataset: {len(houses)}")
print(f"Houses with bathrooms >= 2: {len(houses[houses['bathrooms'] >= 2])}")
print(f"Houses with neighborhood == 1: {len(houses[houses['neighborhood'] == 1])}")
print(f"Houses meeting both conditions: {len(filtered_houses)}")

