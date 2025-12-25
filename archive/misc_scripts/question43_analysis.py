import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split

# Check if statsmodels is available
try:
    import statsmodels.api as sm
    statsmodels_available = True
except ImportError:
    statsmodels_available = False
    print("statsmodels not installed. Will install it...")

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

print("="*80)
print("CLASSIFICATION PROBLEM - PREDICTING PRICE_HILO")
print("="*80)

# (a) Assign price_hilo to a categorical outcome
y_class = houses.price_hilo
X = houses.drop(['price', 'price_hilo'], axis=1)

print(f"\nTarget variable: price_hilo")
print(f"Value counts:\n{y_class.value_counts()}")
print(f"0 = Low price, 1 = High price")

# (b) Split data using stratified random sampling
X_class_train, X_class_test, y_class_train, y_class_test = train_test_split(
    X, y_class,
    train_size=0.7,
    random_state=617,
    stratify=y_class
)

print(f"\nTrain/Test split:")
print(f"X_class_train shape: {X_class_train.shape}")
print(f"X_class_test shape: {X_class_test.shape}")

# Combine features and outcome into single dataframe
train_class = X_class_train.assign(price_hilo=y_class_train)
test_class = X_class_test.assign(price_hilo=y_class_test)

print(f"\ntrain_class shape: {train_class.shape}")
print(f"test_class shape: {test_class.shape}")

if statsmodels_available:
    print("\n" + "="*80)
    print("LOGISTIC REGRESSION USING STATSMODELS")
    print("="*80)
    
    # Prepare data for statsmodels
    X_train_with_const = sm.add_constant(X_class_train)
    
    # Fit logistic regression
    logit_model = sm.Logit(y_class_train, X_train_with_const)
    result = logit_model.fit()
    
    print("\nModel Summary:")
    print(result.summary())
    
    # Extract p-values and determine significance
    print("\n" + "="*80)
    print("STATISTICAL SIGNIFICANCE (alpha = 0.05)")
    print("="*80)
    
    params_df = pd.DataFrame({
        'Variable': result.params.index,
        'Coefficient': result.params.values,
        'P-value': result.pvalues.values,
        'Significant': result.pvalues.values < 0.05
    })
    
    # Remove constant
    params_df = params_df[params_df['Variable'] != 'const']
    params_df = params_df.sort_values('P-value')
    
    print("\n")
    print(params_df.to_string(index=False))
    
    # Identify significant predictors
    significant_vars = params_df[params_df['Significant']]['Variable'].tolist()
    
    print("\n" + "="*80)
    print("ANSWER TO QUESTION 43")
    print("="*80)
    print("\nStatistically significant predictors (p < 0.05):")
    
    for var in X.columns:
        is_sig = var in significant_vars
        marker = "[X]" if is_sig else "[ ]"
        if var in params_df['Variable'].values:
            pval = params_df[params_df['Variable']==var]['P-value'].values[0]
            print(f"{marker} {var} (p={pval:.4e})")
    
    print("\n" + "="*80)
    print(f"Total significant predictors: {len(significant_vars)}")
    print(f"Significant: {significant_vars}")
    print("="*80)
    
else:
    print("\nERROR: statsmodels is not installed.")
    print("Installing statsmodels...")












