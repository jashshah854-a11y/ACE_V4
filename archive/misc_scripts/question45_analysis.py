import pandas as pd
import numpy as np
import statsmodels.api as sm
from sklearn.model_selection import train_test_split

# Read the data
houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")

# Set up classification problem (same as Q43)
y_class = houses.price_hilo
X = houses.drop(['price', 'price_hilo'], axis=1)

X_class_train, X_class_test, y_class_train, y_class_test = train_test_split(
    X, y_class,
    train_size=0.7,
    random_state=617,
    stratify=y_class
)

# Fit logistic regression
X_train_with_const = sm.add_constant(X_class_train)
logit_model = sm.Logit(y_class_train, X_train_with_const)
result = logit_model.fit(disp=0)

print("="*80)
print("IMPACT OF ONE MORE BATHROOM ON LIKELIHOOD OF HIGH PRICE")
print("="*80)

# Get bathrooms coefficient
bathrooms_coef = result.params['bathrooms']
print(f"\nBathrooms coefficient: {bathrooms_coef:.6f}")

# Calculate odds ratio
odds_ratio = np.exp(bathrooms_coef)
print(f"\nOdds ratio: {odds_ratio:.6f}")
print(f"Interpretation: Odds of high price multiply by {odds_ratio:.2f}")
print(f"               (or increase by {(odds_ratio-1)*100:.1f}%)")

# Calculate marginal effect (average partial effect)
# Get average marginal effect
marginal_effects = result.get_margeff()
bathrooms_marginal = marginal_effects.margeff[X.columns.get_loc('bathrooms')]

print(f"\nAverage marginal effect: {bathrooms_marginal:.6f}")
print(f"Interpretation: One more bathroom increases probability")
print(f"               of high price by {bathrooms_marginal*100:.2f} percentage points")

# Alternative calculation at p=0.5 (balanced dataset)
p = 0.5
marginal_at_50 = bathrooms_coef * p * (1-p)
print(f"\nMarginal effect at p=0.5: {marginal_at_50:.6f}")
print(f"Approximately {marginal_at_50*100:.1f} percentage points")

# Calculate probability change from specific baseline
# Example: If baseline prob is 50%, what's new prob with one more bathroom?
baseline_logit = 0  # corresponds to 50% probability
new_logit = baseline_logit + bathrooms_coef
new_prob = 1 / (1 + np.exp(-new_logit))
baseline_prob = 0.5

print(f"\nExample: Starting at 50% probability:")
print(f"  New probability: {new_prob:.4f} ({new_prob*100:.2f}%)")
print(f"  Increase: {(new_prob - baseline_prob)*100:.2f} percentage points")
print(f"  Relative increase: {((new_prob - baseline_prob)/baseline_prob)*100:.1f}%")

print("\n" + "="*80)
print("ANSWER TO QUESTION 45")
print("="*80)

# The odds ratio interpretation
odds_increase_pct = (odds_ratio - 1) * 100

print(f"\nOdds increase by: {odds_increase_pct:.1f}%")
print(f"Probability increase (at p=0.5): {marginal_at_50*100:.1f}%")
print(f"Average marginal effect: {bathrooms_marginal*100:.2f}%")

print("\nOptions:")
print("70%")
print("55%")
print("40%")
print("20%")

# Determine closest answer
# Most likely they want the odds ratio interpretation
if odds_increase_pct > 80:
    closest = "The odds increase by ~92%, but this doesn't match options well."
    print(f"\n{closest}")
    print("\nIf interpreting as marginal effect on probability:")
    print(f"  ~{marginal_at_50*100:.0f}% is closest to: 20%")
elif marginal_at_50*100 < 25:
    print(f"\nMarginal effect ~{marginal_at_50*100:.0f}% is closest to: 20%")
    
print("="*80)












