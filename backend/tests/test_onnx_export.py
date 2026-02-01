"""Test ONNX export module."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from core.model_exporter import (
    export_to_onnx,
    validate_onnx_model,
    export_model_bundle,
    detect_model_type,
)
import tempfile
import shutil

print("=" * 60)
print("  ONNX Export Module Test")
print("=" * 60)

# Create test data
np.random.seed(42)
X = pd.DataFrame({
    'revenue': np.random.randn(100) * 1000 + 5000,
    'spend': np.random.randn(100) * 500 + 2000,
    'clicks': np.random.randint(100, 1000, 100).astype(float),
})
y = (X['revenue'] > 5000).astype(int)

feature_names = list(X.columns)

# Train model
print("\n1. Training RandomForest model...")
model = RandomForestClassifier(n_estimators=10, random_state=42)
model.fit(X, y)
print("   ✓ Model trained")

# Detect model type
model_type = detect_model_type(model)
print(f"\n2. Detected model type: {model_type}")

# Export to ONNX
print("\n3. Exporting to ONNX...")
with tempfile.TemporaryDirectory() as tmpdir:
    result = export_to_onnx(
        model=model,
        feature_names=feature_names,
        model_name="churn_risk_model",
        output_dir=tmpdir,
    )
    
    if result['success']:
        print(f"   ✓ Exported: {result['onnx_path']}")
        print(f"   ✓ File size: {result['file_size_bytes']:,} bytes")
        print(f"   ✓ Model type: {result['model_type']}")
        
        # Validate
        print("\n4. Validating ONNX model...")
        validation = validate_onnx_model(
            result['onnx_path'],
            sample_input=X.head(1).values
        )
        
        if validation['valid']:
            print(f"   ✓ Valid ONNX model")
            print(f"   ✓ Input shape: {validation.get('input_shape')}")
            print(f"   ✓ Inference test: {validation.get('inference_test', 'not run')}")
        else:
            print(f"   ✗ Validation failed: {validation.get('error')}")
        
        # Test bundle export
        print("\n5. Creating model bundle...")
        bundle_result = export_model_bundle(
            model=model,
            feature_names=feature_names,
            training_data=X,
            model_name="ace_churn_model",
            output_dir=tmpdir,
        )
        
        if bundle_result['success']:
            print(f"   ✓ Bundle created: {bundle_result['bundle_dir']}")
            print(f"   ✓ README generated")
            if bundle_result.get('validation', {}).get('inference_test') == 'passed':
                print(f"   ✓ Inference validation passed")
    else:
        print(f"   ✗ Export failed: {result.get('error')}")

print("\n" + "=" * 60)
print("  TEST COMPLETE")
print("=" * 60)
