"""
SHAP Explanation Module - Anchors LLM narratives in model decisions.

Following the CANDLE framework pattern from strategic docs:
SHAP values are passed directly to the LLM, which generates diagnostic
reasoning based on these game-theoretic feature attributions.
"""
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd
import warnings

# Lazy import SHAP to avoid slow startup
_shap = None

def _get_shap():
    """Lazy-load SHAP to avoid slow import at startup."""
    global _shap
    if _shap is None:
        import shap
        _shap = shap
    return _shap


def compute_shap_explanations(
    model: Any,
    X_train: pd.DataFrame,
    X_explain: pd.DataFrame = None,
    model_type: str = "tree",
    max_samples: int = 100,
    n_background: int = 50,
) -> Dict[str, Any]:
    """
    Compute SHAP values for a trained model.
    
    Args:
        model: Trained sklearn-compatible model (LightGBM, XGBoost, RandomForest, etc.)
        X_train: Training data for background distribution
        X_explain: Data to explain (default: sample from X_train)
        model_type: "tree" for tree-based models, "linear" for linear models
        max_samples: Maximum samples to explain
        n_background: Number of background samples for explainer
    
    Returns:
        Dict with SHAP values, feature importance, and explanations
    """
    shap = _get_shap()
    
    # Sample if too large
    if X_train.shape[0] > n_background:
        X_background = X_train.sample(n=n_background, random_state=42)
    else:
        X_background = X_train
    
    if X_explain is None:
        if X_train.shape[0] > max_samples:
            X_explain = X_train.sample(n=max_samples, random_state=42)
        else:
            X_explain = X_train
    elif X_explain.shape[0] > max_samples:
        X_explain = X_explain.sample(n=max_samples, random_state=42)
    
    # Select appropriate explainer
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        
        if model_type == "tree":
            try:
                explainer = shap.TreeExplainer(model, X_background)
            except Exception:
                # Fallback to Kernel explainer
                explainer = shap.KernelExplainer(model.predict, X_background)
        elif model_type == "linear":
            explainer = shap.LinearExplainer(model, X_background)
        else:
            explainer = shap.KernelExplainer(model.predict, X_background)
        
        shap_values = explainer.shap_values(X_explain)
    
    # Handle multi-output models (classification)
    if isinstance(shap_values, list):
        # For binary classification, take positive class
        shap_values = shap_values[-1]
    
    # Handle 3D arrays (samples x features x classes)
    if len(shap_values.shape) == 3:
        # Take positive class (last class)
        shap_values = shap_values[:, :, -1]
    
    # Ensure 2D (samples x features)
    shap_values = np.atleast_2d(shap_values)
    
    # Compute mean absolute SHAP importance
    feature_importance = np.abs(shap_values).mean(axis=0)
    feature_names = list(X_explain.columns)
    
    # Compute directional impact (average SHAP, not absolute)
    directional_impact = shap_values.mean(axis=0)
    
    # Build feature importance dict for proper indexing
    importance_data = []
    for idx, name in enumerate(feature_names):
        imp = float(feature_importance[idx])
        direction = "positive" if directional_impact[idx] > 0 else "negative"
        impact_mag = float(directional_impact[idx])
        importance_data.append({
            "feature": name,
            "importance": imp,
            "direction": direction,
            "impact_magnitude": impact_mag,
        })
    
    # Sort by importance (descending)
    importance_ranking = sorted(importance_data, key=lambda x: x["importance"], reverse=True)
    
    # Get expected value (handle array for multi-class)
    expected_value = explainer.expected_value if hasattr(explainer, 'expected_value') else 0.0
    if isinstance(expected_value, np.ndarray):
        expected_value = float(expected_value[-1])  # Take positive class
    else:
        expected_value = float(expected_value)
    
    return {
        "shap_values": shap_values,
        "feature_names": feature_names,
        "importance_ranking": importance_ranking[:10],
        "base_value": expected_value,
        "explained_samples": len(X_explain),
    }


def explain_single_prediction(
    model: Any,
    X_train: pd.DataFrame,
    instance: pd.Series,
    model_type: str = "tree",
) -> Dict[str, Any]:
    """
    Generate detailed explanation for a single prediction.
    
    Returns feature contributions that drove this specific prediction.
    """
    shap = _get_shap()
    
    # Create explainer
    X_background = X_train.sample(n=min(50, len(X_train)), random_state=42)
    
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        
        if model_type == "tree":
            try:
                explainer = shap.TreeExplainer(model, X_background)
            except Exception:
                explainer = shap.KernelExplainer(model.predict, X_background)
        else:
            explainer = shap.KernelExplainer(model.predict, X_background)
        
        # Explain single instance
        instance_df = instance.to_frame().T
        shap_values = explainer.shap_values(instance_df)
    
    # Handle multi-output
    if isinstance(shap_values, list):
        shap_values = shap_values[-1]
    
    shap_values = shap_values.flatten()
    feature_names = list(instance.index)
    
    # Build contribution breakdown
    contributions = sorted(
        zip(feature_names, shap_values, instance.values),
        key=lambda x: abs(x[1]),
        reverse=True
    )
    
    return {
        "prediction": float(model.predict(instance_df)[0]),
        "base_value": float(explainer.expected_value[-1]) if hasattr(explainer, 'expected_value') and isinstance(explainer.expected_value, np.ndarray) else (float(explainer.expected_value) if hasattr(explainer, 'expected_value') else 0.0),
        "contributions": [
            {
                "feature": name,
                "value": float(value),
                "contribution": float(contrib),
                "direction": "increases" if contrib > 0 else "decreases",
            }
            for name, contrib, value in contributions[:10]
        ],
    }


def generate_shap_narrative(
    shap_result: Dict[str, Any],
    target_name: str = "outcome",
    domain: str = "general",
) -> str:
    """
    Convert SHAP explanations to natural language narrative.
    
    This is the key translation layer for NarrativeEngine integration.
    """
    if not shap_result.get("importance_ranking"):
        return "Unable to generate feature importance explanations."
    
    lines = []
    
    # Top driver
    top = shap_result["importance_ranking"][0]
    feature = top["feature"].replace("_", " ").title()
    direction = "increases" if top["direction"] == "positive" else "decreases"
    
    lines.append(
        f"**{feature}** is the most influential factor, which {direction} {target_name}."
    )
    
    # Second driver if available
    if len(shap_result["importance_ranking"]) > 1:
        second = shap_result["importance_ranking"][1]
        feature2 = second["feature"].replace("_", " ").title()
        ratio = top["importance"] / second["importance"] if second["importance"] > 0 else 1
        
        if ratio > 2:
            lines.append(
                f"**{feature2}** is the second most important, but contributes "
                f"{ratio:.1f}x less influence."
            )
        else:
            lines.append(
                f"**{feature2}** is nearly as important, suggesting both factors "
                f"should be addressed together."
            )
    
    # Summarize remaining top features
    if len(shap_result["importance_ranking"]) > 2:
        other_features = [
            r["feature"].replace("_", " ").title()
            for r in shap_result["importance_ranking"][2:5]
        ]
        if other_features:
            lines.append(
                f"Other contributing factors include: {', '.join(other_features)}."
            )
    
    return " ".join(lines)


def add_shap_to_regression_output(
    regression_result: Dict[str, Any],
    model: Any,
    X_train: pd.DataFrame,
    target_column: str,
) -> Dict[str, Any]:
    """
    Enhance existing regression output with SHAP explanations.
    
    Call this after compute_regression_insights to add SHAP data.
    """
    try:
        shap_result = compute_shap_explanations(
            model=model,
            X_train=X_train,
            model_type="tree",
        )
        
        regression_result["shap_explanations"] = shap_result
        regression_result["shap_narrative"] = generate_shap_narrative(
            shap_result,
            target_name=target_column,
        )
        regression_result["shap_available"] = True
        
    except Exception as e:
        regression_result["shap_available"] = False
        regression_result["shap_error"] = str(e)
    
    return regression_result
