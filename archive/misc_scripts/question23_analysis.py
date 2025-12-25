import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

# Check if mlxtend is available
try:
    from mlxtend.feature_selection import SequentialFeatureSelector as SFS
    mlxtend_available = True
except ImportError:
    mlxtend_available = False
    print("mlxtend not available, will need to install it")

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

# Separate features from outcome variables
y = houses.price
X = houses.drop(['price', 'price_hilo'], axis=1)

# Create binned variable for stratification
y_binned = pd.qcut(y, q=100)

# Split the data (same as Question 2)
X_train, X_test, y_train, y_test = train_test_split(X, y,
                                                    random_state=617,
                                                    train_size=0.7,
                                                    stratify=y_binned)

# Select only the specified variables for stepwise selection
stepwise_vars = ['bedrooms', 'bathrooms', 'area', 'lot_size', 'floors', 'distance_city', 'age']
X_train_subset = X_train[stepwise_vars]
X_test_subset = X_test[stepwise_vars]

print("="*80)
print("STEPWISE VARIABLE SELECTION (mlxtend)")
print("="*80)
print(f"\nCandidate variables: {stepwise_vars}")
print(f"Training set shape: {X_train_subset.shape}")

if mlxtend_available:
    # Create base model
    lr = LinearRegression()
    
    # Perform stepwise selection (bidirectional)
    # forward=True, backward=True means stepwise (both directions)
    # scoring='r2' for R-squared
    # cv=5 for 5-fold cross-validation
    sfs = SFS(lr,
              k_features='best',
              forward=True,
              floating=True,  # This enables backward elimination
              scoring='r2',
              cv=5,
              n_jobs=-1,
              verbose=2)
    
    print("\nPerforming stepwise variable selection...")
    print("This may take a moment...\n")
    
    # Fit the selector
    sfs.fit(X_train_subset, y_train)
    
    # Get selected features
    selected_features = list(sfs.k_feature_names_)
    
    print("\n" + "="*80)
    print("RESULTS")
    print("="*80)
    print(f"\nNumber of features selected: {len(selected_features)}")
    print(f"Selected features: {selected_features}")
    print(f"\nBest cross-validation R²: {sfs.k_score_:.6f}")
    
    print("\n" + "="*80)
    print("ANSWER TO QUESTION 23")
    print("="*80)
    print("\nVariables selected by stepwise selection:")
    
    for var in stepwise_vars:
        marker = "[X]" if var in selected_features else "[ ]"
        print(f"{marker} {var}")
    
    # Verify by building final model
    print("\n" + "="*80)
    print("VERIFICATION - Final Model Performance")
    print("="*80)
    
    final_model = LinearRegression()
    final_model.fit(X_train_subset[selected_features], y_train)
    
    train_r2 = final_model.score(X_train_subset[selected_features], y_train)
    test_r2 = final_model.score(X_test_subset[selected_features], y_test)
    
    print(f"\nFinal model with {len(selected_features)} selected features:")
    print(f"  Train R²: {train_r2:.6f}")
    print(f"  Test R²: {test_r2:.6f}")
    print(f"  CV R²: {sfs.k_score_:.6f}")
    
else:
    print("\nERROR: mlxtend library is not installed.")
    print("The question requires using mlxtend library.")
    print("\nTo install: pip install mlxtend")

print("\n" + "="*80)

