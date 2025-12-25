import numpy as np
import pandas as pd
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

# Combine features and outcome into single dataframe as instructed
train = X_train.assign(price = y_train)
test = X_test.assign(price = y_test)

print("Train and test dataframes created successfully!")
print(f"Train shape: {train.shape}")
print(f"Test shape: {test.shape}")
print(f"\nTrain columns: {train.columns.tolist()}")

# Calculate correlation to determine direction
correlation = train['bathrooms'].corr(train['price'])
print(f"\nCorrelation between bathrooms and price: {correlation}")

# Analyze statistics by bathroom count
print(f"\nStatistics by bathroom count (train sample):")
bathroom_stats = train.groupby('bathrooms').agg({
    'price': ['count', 'mean', 'min', 'max']
}).round(2)
print(bathroom_stats)

# Show sample data points to visualize the relationship
print(f"\nSample data points (first 20 rows of train):")
print(train[['bathrooms', 'price']].head(20))

# Analyze the direction
print("\n" + "="*80)
print("ANSWER TO QUESTION 7")
print("="*80)
print(f"\nScatter plot analysis:")
print(f"  X-axis: bathrooms")
print(f"  Y-axis: price")
print(f"  Correlation coefficient: {correlation}")

if correlation > 0.5:
    direction = "Bottom-left to top-right"
    explanation = "Strong positive correlation - as bathrooms increase, price increases"
elif correlation > 0:
    direction = "Bottom-left to top-right"
    explanation = "Positive correlation - as bathrooms increase, price tends to increase"
elif correlation < -0.5:
    direction = "Top-left to bottom-right"
    explanation = "Strong negative correlation - as bathrooms increase, price decreases"
elif correlation < 0:
    direction = "Top-left to bottom-right"
    explanation = "Negative correlation - as bathrooms increase, price tends to decrease"
else:
    direction = "No clear direction"
    explanation = "No correlation between bathrooms and price"

print(f"\nDirection of points: {direction}")
print(f"Explanation: {explanation}")

# Show mean price progression by bathroom count
print(f"\nMean price by bathroom count (train sample):")
mean_price_by_bathrooms = train.groupby('bathrooms')['price'].mean().sort_index()
for bathrooms, mean_price in mean_price_by_bathrooms.items():
    print(f"  {bathrooms} bathrooms: ${mean_price:,.2f}")

print("\n" + "="*80)
