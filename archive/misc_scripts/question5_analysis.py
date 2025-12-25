import numpy as np
import pandas as pd

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

print("Dataset loaded successfully!")
print(f"Shape: {houses.shape}")

# Check the bedrooms column
print(f"\nBedrooms column unique values: {sorted(houses['bedrooms'].unique())}")
print(f"\nBedrooms value counts:")
print(houses['bedrooms'].value_counts().sort_index())

# Calculate median age by number of bedrooms
median_age_by_bedrooms = houses.groupby('bedrooms')['age'].median().sort_index()

print("\n" + "="*80)
print("MEDIAN AGE BY NUMBER OF BEDROOMS")
print("="*80)
print(median_age_by_bedrooms)

# Find which has the highest median age (oldest)
oldest_bedroom_count = median_age_by_bedrooms.idxmax()
oldest_median_age = median_age_by_bedrooms.max()

print("\n" + "="*80)
print("ANSWER TO QUESTION 5")
print("="*80)
print(f"\nMedian age by bedroom count:")
for bedrooms, median_age in median_age_by_bedrooms.items():
    marker = " <-- OLDEST" if bedrooms == oldest_bedroom_count else ""
    print(f"  {bedrooms} bedroom house: {median_age}{marker}")

print(f"\nThe oldest houses (by median age) are: {oldest_bedroom_count} bedroom houses")
print(f"Median age: {oldest_median_age}")
print("="*80)

# Additional statistics for context
print(f"\nAdditional statistics:")
print(f"\nMean age by bedroom count:")
mean_age_by_bedrooms = houses.groupby('bedrooms')['age'].mean().sort_index()
print(mean_age_by_bedrooms)

print(f"\nCount of houses by bedroom count:")
count_by_bedrooms = houses.groupby('bedrooms').size().sort_index()
print(count_by_bedrooms)

