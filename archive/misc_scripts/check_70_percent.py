import pandas as pd
import numpy as np
import statsmodels.api as sm
from sklearn.model_selection import train_test_split

houses = pd.read_csv(r"C:\Users\jashs\Downloads\version_F.csv")
y_class = houses.price_hilo
X = houses.drop(['price', 'price_hilo'], axis=1)

X_train, X_test, y_train, y_test = train_test_split(
    X, y_class, train_size=0.7, random_state=617, stratify=y_class)

X_train_const = sm.add_constant(X_train)
model = sm.Logit(y_train, X_train_const).fit(disp=0)

bathrooms_coef = model.params['bathrooms']
odds_ratio = np.exp(bathrooms_coef)

print("="*80)
print("CHECKING IF 70% IS CORRECT")
print("="*80)

print(f"\nBathrooms coefficient: {bathrooms_coef:.6f}")
print(f"Odds ratio: {odds_ratio:.6f}")

print("\n" + "="*80)
print("INTERPRETATION 1: Increase in probability")
print("="*80)
print("Starting at 50% baseline:")
baseline_prob = 0.5
baseline_logit = np.log(baseline_prob / (1 - baseline_prob))
new_logit = baseline_logit + bathrooms_coef
new_prob = 1 / (1 + np.exp(-new_logit))
print(f"  Baseline: {baseline_prob*100:.1f}%")
print(f"  With +1 bathroom: {new_prob*100:.1f}%")
print(f"  Increase: {(new_prob - baseline_prob)*100:.1f} percentage points")
print(f"  → Rounds to: {round(new_prob*100, -1):.0f}%")

print("\n" + "="*80)
print("INTERPRETATION 2: Odds increase as percentage")
print("="*80)
print(f"Odds multiply by {odds_ratio:.3f}")
print(f"This is {(odds_ratio-1)*100:.1f}% increase in odds")
print(f"→ Rounds to: {round((odds_ratio-1)*100, -1):.0f}%")

print("\n" + "="*80)
print("INTERPRETATION 3: Final probability (if baseline=30%)")
print("="*80)
baseline_prob = 0.3
baseline_logit = np.log(baseline_prob / (1 - baseline_prob))
new_logit = baseline_logit + bathrooms_coef
new_prob = 1 / (1 + np.exp(-new_logit))
print(f"  Baseline: {baseline_prob*100:.1f}%")
print(f"  With +1 bathroom: {new_prob*100:.1f}%")

print("\n" + "="*80)
print("WHICH INTERPRETATION GIVES 70%?")
print("="*80)
print(f"\n1. Final probability from 50% baseline: {new_prob_from_50:.1f}% ≈ 70%? NO ({new_prob_from_50:.1f}% ≈ 66%)")

# Recalculate from 50%
baseline_prob = 0.5
baseline_logit = np.log(baseline_prob / (1 - baseline_prob))
new_logit = baseline_logit + bathrooms_coef
new_prob_from_50 = 1 / (1 + np.exp(-new_logit))

print(f"2. Odds increase: {(odds_ratio-1)*100:.1f}% ≈ 70%? NO (92% ≈ 90%)")

# Try different baselines to see which gives 70%
print("\n" + "="*80)
print("FINDING BASELINE THAT GIVES 70% FINAL PROBABILITY")
print("="*80)
target_prob = 0.70
target_logit = np.log(target_prob / (1 - target_prob))
baseline_logit = target_logit - bathrooms_coef
baseline_prob = 1 / (1 + np.exp(-baseline_logit))
print(f"\nIf we want 70% with +1 bathroom:")
print(f"  Need baseline of: {baseline_prob*100:.1f}%")
print(f"  With +1 bathroom: {target_prob*100:.1f}%")

print("\n" + "="*80)
print("POSSIBLE ANSWER")
print("="*80)
print(f"\nIf question means 'final likelihood' from ~50% baseline:")
print(f"  Answer: {round(new_prob_from_50*100, -1):.0f}% (rounds to 70%)")
print(f"\nIf question means 'percentage point increase':")
print(f"  Answer: {round((new_prob_from_50-0.5)*100, -1):.0f}% (rounds to 20%)")

print("\n→ CODEX likely interpreted as FINAL PROBABILITY: ~66-70%")
print("→ I interpreted as INCREASE: ~16-20%")
print("\nBoth interpretations are reasonable depending on question wording!")
print("="*80)












