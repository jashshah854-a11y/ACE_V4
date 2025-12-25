import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, roc_curve
import matplotlib.pyplot as plt

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

print("="*80)
print("LOGISTIC REGRESSION WITH SCIKIT-LEARN")
print("="*80)

# Set up classification problem (same as Q43)
y_class = houses.price_hilo
X = houses.drop(['price', 'price_hilo'], axis=1)

# Split data (same as Q43)
X_class_train, X_class_test, y_class_train, y_class_test = train_test_split(
    X, y_class,
    train_size=0.7,
    random_state=617,
    stratify=y_class
)

print(f"\nTrain set: {X_class_train.shape}")
print(f"Test set: {X_class_test.shape}")

# Fit logistic regression with sklearn
logistic_model = LogisticRegression(
    max_iter=10000,
    random_state=617
)

print(f"\nFitting Logistic Regression...")
print(f"  max_iter: 10000")
print(f"  random_state: 617")

logistic_model.fit(X_class_train, y_class_train)

print(f"Model fitted successfully!")
print(f"Converged: {logistic_model.n_iter_} iterations")

# Get predicted probabilities for train sample
y_train_proba = logistic_model.predict_proba(X_class_train)[:, 1]

# Calculate AUC-ROC for train sample
train_auc = roc_auc_score(y_class_train, y_train_proba)

# Also calculate for test sample for comparison
y_test_proba = logistic_model.predict_proba(X_class_test)[:, 1]
test_auc = roc_auc_score(y_class_test, y_test_proba)

print("\n" + "="*80)
print("ANSWER TO QUESTION 47")
print("="*80)
print(f"\nArea under ROC curve (AUC):")
print(f"  Train sample: {train_auc}")
print(f"  Test sample: {test_auc}")

print("\n" + "="*80)
print(f"SUBMIT THIS ANSWER: {train_auc}")
print("="*80)

# Additional metrics
from sklearn.metrics import accuracy_score, classification_report

y_train_pred = logistic_model.predict(X_class_train)
train_accuracy = accuracy_score(y_class_train, y_train_pred)

print("\n" + "="*80)
print("ADDITIONAL MODEL PERFORMANCE")
print("="*80)
print(f"\nTrain accuracy: {train_accuracy:.6f}")
print(f"Train AUC: {train_auc:.6f}")

print("\nCoefficients:")
coef_df = pd.DataFrame({
    'Feature': X.columns,
    'Coefficient': logistic_model.coef_[0]
}).sort_values('Coefficient', key=abs, ascending=False)
print(coef_df.head(5).to_string(index=False))

print("\n" + "="*80)












