"""
ONNX Model Export Module - Transforms ACE from reporter to model factory.

Following the strategic documents:
"Export trained models in ONNX format... transforms ACE V4 from a 
reporting tool into a model generation engine."

Supports:
- LightGBM models
- RandomForest models  
- XGBoost models
- Linear models
"""
from typing import Dict, Any, Optional, List, Tuple
import numpy as np
import pandas as pd
from pathlib import Path
import json
import warnings
from datetime import datetime

# Lazy imports to avoid startup overhead
_onnx = None
_skl2onnx = None


def _get_onnx():
    """Lazy-load ONNX."""
    global _onnx
    if _onnx is None:
        import onnx
        _onnx = onnx
    return _onnx


def _get_skl2onnx():
    """Lazy-load skl2onnx converter."""
    global _skl2onnx
    if _skl2onnx is None:
        import skl2onnx
        from skl2onnx.common.data_types import FloatTensorType
        _skl2onnx = skl2onnx
    return _skl2onnx


def detect_model_type(model) -> str:
    """Detect the type of ML model for appropriate conversion."""
    model_class = type(model).__name__
    
    if "LGBMClassifier" in model_class or "LGBMRegressor" in model_class:
        return "lightgbm"
    elif "XGB" in model_class:
        return "xgboost"
    elif "RandomForest" in model_class:
        return "sklearn_ensemble"
    elif "GradientBoosting" in model_class:
        return "sklearn_ensemble"
    elif "LogisticRegression" in model_class or "LinearRegression" in model_class:
        return "sklearn_linear"
    elif "Pipeline" in model_class:
        return "sklearn_pipeline"
    else:
        return "sklearn_generic"


def export_to_onnx(
    model,
    feature_names: List[str],
    model_name: str = "ace_model",
    output_dir: str = None,
    include_metadata: bool = True,
) -> Dict[str, Any]:
    """
    Export a trained model to ONNX format.
    
    Args:
        model: Trained sklearn-compatible model
        feature_names: List of input feature names
        model_name: Name for the exported model
        output_dir: Directory to save the model (default: current directory)
        include_metadata: Whether to include model metadata JSON
    
    Returns:
        Dict with export status, file paths, and metadata
    """
    onnx = _get_onnx()
    skl2onnx = _get_skl2onnx()
    from skl2onnx.common.data_types import FloatTensorType
    
    output_dir = Path(output_dir) if output_dir else Path(".")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    model_type = detect_model_type(model)
    n_features = len(feature_names)
    
    # Define input type
    initial_type = [("input", FloatTensorType([None, n_features]))]
    
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            
            # Convert to ONNX
            if model_type == "lightgbm":
                # LightGBM needs special handling
                from skl2onnx import convert_sklearn
                from skl2onnx.common.shape_calculator import (
                    calculate_linear_classifier_output_shapes
                )
                onnx_model = convert_sklearn(
                    model, 
                    initial_types=initial_type,
                    target_opset=12,
                )
            else:
                # Standard sklearn conversion
                onnx_model = skl2onnx.convert_sklearn(
                    model,
                    initial_types=initial_type,
                    target_opset=12,
                )
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        onnx_filename = f"{model_name}_{timestamp}.onnx"
        onnx_path = output_dir / onnx_filename
        
        # Save ONNX model
        onnx.save_model(onnx_model, str(onnx_path))
        
        # Generate metadata
        metadata = {
            "model_name": model_name,
            "model_type": model_type,
            "original_class": type(model).__name__,
            "n_features": n_features,
            "feature_names": feature_names,
            "exported_at": datetime.now().isoformat(),
            "onnx_file": onnx_filename,
            "opset_version": 12,
        }
        
        # Add model-specific metadata
        if hasattr(model, "n_estimators"):
            metadata["n_estimators"] = model.n_estimators
        if hasattr(model, "classes_"):
            metadata["classes"] = model.classes_.tolist()
        if hasattr(model, "feature_importances_"):
            importance_dict = dict(zip(feature_names, model.feature_importances_.tolist()))
            # Sort by importance
            sorted_importance = sorted(importance_dict.items(), key=lambda x: x[1], reverse=True)
            metadata["feature_importances"] = dict(sorted_importance[:10])
        
        # Save metadata
        if include_metadata:
            metadata_path = output_dir / f"{model_name}_{timestamp}_metadata.json"
            with open(metadata_path, "w") as f:
                json.dump(metadata, f, indent=2)
            metadata["metadata_file"] = str(metadata_path)
        
        return {
            "success": True,
            "onnx_path": str(onnx_path),
            "model_type": model_type,
            "metadata": metadata,
            "file_size_bytes": onnx_path.stat().st_size,
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "model_type": model_type,
        }


def validate_onnx_model(
    onnx_path: str,
    sample_input: np.ndarray = None,
) -> Dict[str, Any]:
    """
    Validate an exported ONNX model.
    
    Args:
        onnx_path: Path to the ONNX model file
        sample_input: Optional sample input for inference test
    
    Returns:
        Dict with validation results
    """
    onnx = _get_onnx()
    
    try:
        # Load and check model
        model = onnx.load(onnx_path)
        onnx.checker.check_model(model)
        
        result = {
            "valid": True,
            "graph_name": model.graph.name,
            "n_inputs": len(model.graph.input),
            "n_outputs": len(model.graph.output),
            "opset_version": model.opset_import[0].version if model.opset_import else None,
        }
        
        # Get input/output shapes
        for inp in model.graph.input:
            shape = [d.dim_value for d in inp.type.tensor_type.shape.dim]
            result["input_shape"] = shape
            result["input_name"] = inp.name
        
        for out in model.graph.output:
            result["output_name"] = out.name
        
        # Run inference test if sample provided
        if sample_input is not None:
            try:
                import onnxruntime as ort
                
                session = ort.InferenceSession(onnx_path)
                input_name = session.get_inputs()[0].name
                
                # Ensure correct shape
                if len(sample_input.shape) == 1:
                    sample_input = sample_input.reshape(1, -1)
                
                output = session.run(None, {input_name: sample_input.astype(np.float32)})
                result["inference_test"] = "passed"
                result["sample_output_shape"] = list(output[0].shape)
                
            except Exception as e:
                result["inference_test"] = f"failed: {str(e)}"
        
        return result
        
    except Exception as e:
        return {
            "valid": False,
            "error": str(e),
        }


def export_model_bundle(
    model,
    feature_names: List[str],
    training_data: pd.DataFrame = None,
    target_column: str = None,
    model_name: str = "ace_model",
    output_dir: str = None,
) -> Dict[str, Any]:
    """
    Export a complete model bundle with ONNX model, metadata, and sample data.
    
    This creates a production-ready package that can be deployed to:
    - Azure ML
    - AWS SageMaker
    - ONNX Runtime servers
    - Edge devices
    
    Args:
        model: Trained model
        feature_names: List of feature names
        training_data: Optional training data for sample generation
        target_column: Name of target column if training_data provided
        model_name: Name for the bundle
        output_dir: Output directory
    
    Returns:
        Dict with bundle contents and paths
    """
    output_dir = Path(output_dir) if output_dir else Path(".")
    bundle_dir = output_dir / f"{model_name}_bundle"
    bundle_dir.mkdir(parents=True, exist_ok=True)
    
    # Export ONNX model
    export_result = export_to_onnx(
        model=model,
        feature_names=feature_names,
        model_name=model_name,
        output_dir=str(bundle_dir),
        include_metadata=True,
    )
    
    if not export_result["success"]:
        return export_result
    
    # Generate sample input/output for testing
    if training_data is not None:
        sample_data = training_data[feature_names].head(5)
        sample_input_path = bundle_dir / "sample_input.csv"
        sample_data.to_csv(sample_input_path, index=False)
        export_result["sample_input_path"] = str(sample_input_path)
        
        # Validate with sample
        sample_array = sample_data.values.astype(np.float32)
        validation = validate_onnx_model(export_result["onnx_path"], sample_array)
        export_result["validation"] = validation
    else:
        # Validate without sample
        validation = validate_onnx_model(export_result["onnx_path"])
        export_result["validation"] = validation
    
    # Create README
    readme_content = f"""# {model_name} ONNX Model Bundle

## Model Information
- **Type**: {export_result['model_type']}
- **Features**: {len(feature_names)}
- **Exported**: {datetime.now().isoformat()}

## Files
- `{Path(export_result['onnx_path']).name}` - ONNX model file
- `*_metadata.json` - Model metadata and feature importances
- `sample_input.csv` - Sample input data (if included)

## Usage

### Python (ONNX Runtime)
```python
import onnxruntime as ort
import numpy as np

session = ort.InferenceSession("{Path(export_result['onnx_path']).name}")
input_name = session.get_inputs()[0].name

# Prepare input (must match feature order)
input_data = np.array([[...]], dtype=np.float32)
output = session.run(None, {{input_name: input_data}})
```

## Feature Order
{chr(10).join(f'{i+1}. {name}' for i, name in enumerate(feature_names[:10]))}
{"..." if len(feature_names) > 10 else ""}
"""
    
    readme_path = bundle_dir / "README.md"
    readme_path.write_text(readme_content)
    export_result["readme_path"] = str(readme_path)
    export_result["bundle_dir"] = str(bundle_dir)
    
    return export_result


def get_supported_models() -> List[str]:
    """Return list of supported model types for ONNX export."""
    return [
        "LGBMClassifier",
        "LGBMRegressor", 
        "RandomForestClassifier",
        "RandomForestRegressor",
        "GradientBoostingClassifier",
        "GradientBoostingRegressor",
        "XGBClassifier",
        "XGBRegressor",
        "LogisticRegression",
        "LinearRegression",
        "Ridge",
        "Lasso",
        "DecisionTreeClassifier",
        "DecisionTreeRegressor",
    ]
