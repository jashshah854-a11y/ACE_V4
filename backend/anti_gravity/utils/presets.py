
MODEL_PRESETS = {
    "ACE Auto": {},
    "Speed Run": {"fast_mode": True, "model_type": "random_forest", "include_categoricals": False},
    "High Fidelity": {"fast_mode": False, "model_type": "gradient_boosting", "include_categoricals": True},
    "Categorical Heavy": {"fast_mode": False, "model_type": "linear", "include_categoricals": True},
}
